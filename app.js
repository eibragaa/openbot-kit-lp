// app.js — Interações, Abas e Validação do Kit OpenBot (@jeanbraga.ia)

document.addEventListener("DOMContentLoaded", () => {
  // 1. Abas da Janela de Preview
  const tabButtons = document.querySelectorAll(".t-tab");
  const codePanes = document.querySelectorAll(".code-pane");

  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-tab");
      tabButtons.forEach(b => b.classList.remove("active"));
      codePanes.forEach(p => p.classList.remove("active"));

      btn.classList.add("active");
      const targetPane = document.getElementById("code-" + target);
      if (targetPane) {
        targetPane.classList.add("active");
      }
    });
  });

  // 2. Formulário e Campos
  const nameInput = document.getElementById("lead_name");
  const contactInput = document.getElementById("contact_input");
  const contactBadge = document.getElementById("contact_badge");
  const validationMsg = document.getElementById("validation_msg");
  const submitBtn = document.getElementById("submitBtn");
  const hiddenType = document.getElementById("contact_type");
  const hiddenNormalized = document.getElementById("contact_normalized");
  const hiddenPageUrl = document.getElementById("page_url");

  if (hiddenPageUrl) {
    hiddenPageUrl.value = window.location.href;
  }

  // Captura parâmetros UTM
  const params = new URLSearchParams(window.location.search);
  const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content"];
  utmKeys.forEach(k => {
    const el = document.getElementById(k);
    if (el && params.has(k)) {
      el.value = params.get(k);
    }
  });

  // DDDs ativos no Brasil
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
    let digits = val.replace(/\D/g, "");

    if (digits.startsWith("55") && digits.length > 11) {
      digits = digits.slice(2);
    }

    if (digits.length > 11) {
      digits = digits.slice(0, 11);
    }

    let formatted = "";
    if (digits.length > 0) {
      formatted = "(" + digits.slice(0, 2);
    }
    if (digits.length >= 3) {
      formatted += ") ";
      if (digits.length > 7) {
        const splitPos = digits.length === 11 ? 7 : 6;
        formatted += digits.slice(2, splitPos) + "-" + digits.slice(splitPos);
      } else {
        formatted += digits.slice(2);
      }
    }

    if (digits.length < 10) {
      return {
        formatted,
        valid: false,
        error: "Digite o DDD + WhatsApp (mínimo 10 dígitos)"
      };
    }

    const ddd = digits.slice(0, 2);
    if (!validDDDs.has(ddd)) {
      return {
        formatted,
        valid: false,
        error: `DDD (${ddd}) inválido no Brasil`
      };
    }

    if (digits.length === 11) {
      const nine = digits.charAt(2);
      if (nine !== "9") {
        return {
          formatted,
          valid: false,
          error: "Celular de 11 dígitos deve iniciar com 9 após o DDD"
        };
      }
    }

    return {
      formatted,
      valid: true,
      normalized: "+55" + digits
    };
  }

  function checkFormValidity() {
    const nameValid = nameInput.value.trim().length >= 2;
    const rawContact = contactInput.value.trim();

    if (!rawContact) {
      contactBadge.textContent = "Aguardando";
      contactBadge.className = "type-badge";
      validationMsg.textContent = "";
      validationMsg.className = "field-feedback";
      contactInput.className = "field-input";
      submitBtn.disabled = true;
      hiddenType.value = "unknown";
      hiddenNormalized.value = "";
      return;
    }

    if (isEmailCandidate(rawContact)) {
      contactBadge.textContent = "E-mail";
      contactBadge.className = "type-badge email";
      const res = validateEmail(rawContact);

      if (res.valid) {
        validationMsg.textContent = "E-mail pronto";
        validationMsg.className = "field-feedback success";
        contactInput.className = "field-input valid-field";
        hiddenType.value = "email";
        hiddenNormalized.value = res.normalized;
        submitBtn.disabled = !nameValid;
      } else {
        validationMsg.textContent = res.error;
        validationMsg.className = "field-feedback error";
        contactInput.className = "field-input invalid-field";
        hiddenType.value = "email";
        hiddenNormalized.value = "";
        submitBtn.disabled = true;
      }
    } else {
      contactBadge.textContent = "WhatsApp";
      contactBadge.className = "type-badge whatsapp";
      const res = formatAndValidatePhone(rawContact);

      if (res.formatted && res.formatted !== rawContact) {
        contactInput.value = res.formatted;
      }

      if (res.valid) {
        validationMsg.textContent = "WhatsApp pronto";
        validationMsg.className = "field-feedback success";
        contactInput.className = "field-input valid-field";
        hiddenType.value = "whatsapp";
        hiddenNormalized.value = res.normalized;
        submitBtn.disabled = !nameValid;
      } else {
        validationMsg.textContent = res.error;
        validationMsg.className = "field-feedback error";
        contactInput.className = "field-input invalid-field";
        hiddenType.value = "whatsapp";
        hiddenNormalized.value = "";
        submitBtn.disabled = true;
      }
    }
  }

  contactInput.addEventListener("input", checkFormValidity);
  nameInput.addEventListener("input", checkFormValidity);

  // Guarda o nome localmente para personalizar obrigado.html
  const leadForm = document.getElementById("leadForm");
  if (leadForm) {
    leadForm.addEventListener("submit", () => {
      const name = nameInput.value.trim();
      if (name) {
        try {
          localStorage.setItem("openbot_lead_name", name);
          sessionStorage.setItem("openbot_lead_name", name);
        } catch (e) {}
      }
    });
  }
});
