// app.js - Validação Inteligente e Rastreamento de Leads

document.addEventListener("DOMContentLoaded", () => {
  const contactInput = document.getElementById("contact_input");
  const contactBadge = document.getElementById("contact_badge");
  const validationMsg = document.getElementById("validation_msg");
  const submitBtn = document.getElementById("submitBtn");
  const hiddenType = document.getElementById("contact_type");
  const hiddenNormalized = document.getElementById("contact_normalized");

  // Captura UTMs da URL
  const params = new URLSearchParams(window.location.search);
  const utmFields = ["utm_source", "utm_medium", "utm_campaign", "utm_content"];
  utmFields.forEach(field => {
    const el = document.getElementById(field);
    if (el && params.has(field)) {
      el.value = params.get(field);
    }
  });

  // Lista de DDDs válidos no Brasil
  const validDDDs = new Set([
    "11","12","13","14","15","16","17","18","19",
    "21","22","24","27","28",
    "31","32","33","34","35","37","38",
    "41","42","43","44","45","46","47","48","49",
    "51","53","54","55",
    "61","62","63","64","65","66","67","68","69",
    "71","73","74","75","77","79",
    "81","82","83","84","85","86","87","88","89",
    "91","92","93","94","95","96","97","98","99"
  ]);

  function isEmailCandidate(val) {
    return val.includes("@") || /[a-zA-Z]/.test(val);
  }

  function validateEmail(val) {
    const clean = val.trim().toLowerCase();
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!regex.test(clean)) {
      return { valid: false, error: "Digite um e-mail válido (ex: seu@email.com)" };
    }
    return { valid: true, normalized: clean };
  }

  function formatAndValidatePhone(val) {
    // Remove tudo que não é dígito
    let digits = val.replace(/\D/g, "");

    // Se começou com 55 e tem mais de 11 dígitos, remove o 55 do início para formatar com DDD
    if (digits.startsWith("55") && digits.length > 11) {
      digits = digits.slice(2);
    }

    // Limita a 11 dígitos
    if (digits.length > 11) {
      digits = digits.slice(0, 11);
    }

    // Formatação progressiva
    let formatted = "";
    if (digits.length > 0) {
      formatted = "(" + digits.slice(0, 2);
    }
    if (digits.length >= 3) {
      formatted += ") ";
      if (digits.length > 7) {
        // Celular 9 dígitos ou fixo 8 dígitos
        const splitPos = digits.length === 11 ? 7 : 6;
        formatted += digits.slice(2, splitPos) + "-" + digits.slice(splitPos);
      } else {
        formatted += digits.slice(2);
      }
    }

    // Validação
    if (digits.length < 10) {
      return {
        formatted,
        valid: false,
        error: "Digite o DDD + número do WhatsApp (mínimo 10 dígitos)"
      };
    }

    const ddd = digits.slice(0, 2);
    if (!validDDDs.has(ddd)) {
      return {
        formatted,
        valid: false,
        error: `DDD (${ddd}) não é válido no Brasil`
      };
    }

    if (digits.length === 11) {
      const nine = digits.charAt(2);
      if (nine !== "9") {
        return {
          formatted,
          valid: false,
          error: "Celular com 11 dígitos deve iniciar com 9 após o DDD"
        };
      }
    }

    return {
      formatted,
      valid: true,
      normalized: "+55" + digits
    };
  }

  contactInput.addEventListener("input", (e) => {
    const rawVal = contactInput.value;

    if (!rawVal.trim()) {
      contactBadge.textContent = "Aguardando";
      contactBadge.className = "type-indicator";
      validationMsg.textContent = "";
      validationMsg.className = "field-feedback";
      contactInput.className = "form-input";
      submitBtn.disabled = true;
      hiddenType.value = "unknown";
      hiddenNormalized.value = "";
      return;
    }

    if (isEmailCandidate(rawVal)) {
      // Modo E-mail
      contactBadge.textContent = "E-mail";
      contactBadge.className = "type-indicator email";
      const res = validateEmail(rawVal);

      if (res.valid) {
        validationMsg.textContent = "E-mail pronto para receber o kit";
        validationMsg.className = "field-feedback success";
        contactInput.className = "form-input valid-email";
        submitBtn.disabled = false;
        hiddenType.value = "email";
        hiddenNormalized.value = res.normalized;
      } else {
        validationMsg.textContent = res.error;
        validationMsg.className = "field-feedback error";
        contactInput.className = "form-input invalid-input";
        submitBtn.disabled = true;
        hiddenType.value = "email";
        hiddenNormalized.value = "";
      }
    } else {
      // Modo Telefone / WhatsApp
      contactBadge.textContent = "WhatsApp";
      contactBadge.className = "type-indicator whatsapp";
      const res = formatAndValidatePhone(rawVal);

      // Atualiza o valor formatado no input se mudou
      if (res.formatted && res.formatted !== rawVal) {
        contactInput.value = res.formatted;
      }

      if (res.valid) {
        validationMsg.textContent = "WhatsApp pronto para receber o kit";
        validationMsg.className = "field-feedback success";
        contactInput.className = "form-input valid-phone";
        submitBtn.disabled = false;
        hiddenType.value = "whatsapp";
        hiddenNormalized.value = res.normalized;
      } else {
        validationMsg.textContent = res.error;
        validationMsg.className = "field-feedback error";
        contactInput.className = "form-input invalid-input";
        submitBtn.disabled = true;
        hiddenType.value = "whatsapp";
        hiddenNormalized.value = "";
      }
    }
  });
});
