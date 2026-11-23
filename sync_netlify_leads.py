#!/usr/bin/env python3
"""
sync_netlify_leads.py
Sincroniza e valida submissões do formulário Netlify Forms ('kit-openbot-leads')
para a esteira do OpenBot (@jeanbraga.ia).
Saída: JSON estruturado no stdout pronto para ingestão na tabela landing_leads.
Modo de teste: python3 sync_netlify_leads.py --self-test
"""

import sys
import os
import json
import re
import argparse
from datetime import datetime, timezone

# Conjunto oficial de DDDs ativos no Brasil
VALID_DDDS = {
    "11","12","13","14","15","16","17","18","19",
    "21","22","24","27","28",
    "31","32","33","34","35","37","38",
    "41","42","43","44","45","46","47","48","49",
    "51","53","54","55",
    "61","62","63","64","65","66","67","68","69",
    "71","73","74","75","77","79",
    "81","82","83","84","85","86","87","88","89",
    "91","92","93","94","95","96","97","98","99"
}

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")


def is_email_candidate(val: str) -> bool:
    if not val:
        return False
    return "@" in val or any(c.isalpha() for c in val)


def validate_email(raw: str):
    clean = raw.strip().lower()
    if not EMAIL_REGEX.match(clean):
        return {
            "valid": False,
            "type": "email",
            "normalized": clean,
            "error": "Formato de e-mail inválido"
        }
    domain = clean.split("@")[-1]
    if "." not in domain or len(domain.split(".")[-1]) < 2:
        return {
            "valid": False,
            "type": "email",
            "normalized": clean,
            "error": "Domínio de e-mail inválido"
        }
    return {
        "valid": True,
        "type": "email",
        "normalized": clean,
        "error": None
    }


def validate_phone(raw: str):
    digits = re.sub(r"\D", "", raw)
    if digits.startswith("55") and len(digits) > 11:
        digits = digits[2:]

    if len(digits) < 10:
        return {
            "valid": False,
            "type": "whatsapp",
            "normalized": digits,
            "error": "Telefone com menos de 10 dígitos (DDD ausente ou incompleto)"
        }

    if len(digits) > 11:
        return {
            "valid": False,
            "type": "whatsapp",
            "normalized": digits,
            "error": "Telefone com mais de 11 dígitos"
        }

    ddd = digits[:2]
    if ddd not in VALID_DDDS:
        return {
            "valid": False,
            "type": "whatsapp",
            "normalized": digits,
            "error": f"DDD ({ddd}) inválido no Brasil"
        }

    if len(digits) == 11:
        nine = digits[2]
        if nine != "9":
            return {
                "valid": False,
                "type": "whatsapp",
                "normalized": digits,
                "error": "Celular de 11 dígitos deve iniciar com 9 após o DDD"
            }

    normalized = f"+55{digits}"
    return {
        "valid": True,
        "type": "whatsapp",
        "normalized": normalized,
        "error": None
    }


def process_lead(raw_data: dict) -> dict:
    name = str(raw_data.get("name") or "").strip()
    raw_contact = str(raw_data.get("contact_raw") or raw_data.get("contact") or "").strip()
    declared_type = str(raw_data.get("contact_type") or "").lower()

    if declared_type == "email" or is_email_candidate(raw_contact):
        val_res = validate_email(raw_contact)
    else:
        val_res = validate_phone(raw_contact)

    return {
        "id": raw_data.get("id") or f"lead_{int(datetime.now(timezone.utc).timestamp()*1000)}",
        "name": name,
        "raw_contact": raw_contact,
        "contact_type": val_res["type"],
        "contact_normalized": val_res["normalized"],
        "validation_status": "valid" if val_res["valid"] else "invalid",
        "validation_error": val_res["error"],
        "campaign_slug": raw_data.get("campaign_slug") or "reel_2026_11_23_openbot",
        "keyword": raw_data.get("keyword") or "OPENBOT",
        "utm_source": raw_data.get("utm_source") or "",
        "utm_medium": raw_data.get("utm_medium") or "",
        "utm_campaign": raw_data.get("utm_campaign") or "",
        "utm_content": raw_data.get("utm_content") or "",
        "created_at": raw_data.get("created_at") or datetime.now(timezone.utc).isoformat()
    }


def deduplicate_leads(leads: list) -> list:
    seen = set()
    deduped = []
    for lead in leads:
        norm = lead["contact_normalized"]
        if norm and norm in seen:
            lead["is_duplicate"] = True
        else:
            lead["is_duplicate"] = False
            if norm:
                seen.add(norm)
        deduped.append(lead)
    return deduped


def fetch_netlify_submissions(token: str, site_id: str, form_name: str = "kit-openbot-leads") -> list:
    import urllib.request
    import urllib.error

    url = f"https://api.netlify.com/api/v1/sites/{site_id}/submissions"
    req = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "User-Agent": "OpenBot-Funnel-Sync/1.0"
        }
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            results = []
            for item in data:
                f_name = item.get("form_name")
                if form_name and f_name != form_name:
                    continue
                d = item.get("data", {})
                results.append({
                    "id": item.get("id"),
                    "name": d.get("name"),
                    "contact_raw": d.get("contact_raw") or d.get("contact"),
                    "contact_type": d.get("contact_type"),
                    "campaign_slug": d.get("campaign_slug"),
                    "keyword": d.get("keyword"),
                    "utm_source": d.get("utm_source"),
                    "utm_medium": d.get("utm_medium"),
                    "utm_campaign": d.get("utm_campaign"),
                    "utm_content": d.get("utm_content"),
                    "created_at": item.get("created_at")
                })
            return results
    except urllib.error.HTTPError as e:
        sys.stderr.write(f"[ERRO Netlify API] HTTP {e.code}: {e.reason}\n")
        return []
    except Exception as e:
        sys.stderr.write(f"[ERRO de Conexão] {str(e)}\n")
        return []


def run_self_test():
    print("=== EXECUTANDO SELF-TEST DE SINCRONIZAÇÃO E VALIDAÇÃO DE LEADS ===")
    test_cases = [
        {
            "desc": "WhatsApp SP Válido (11 Dígitos com 9)",
            "input": {"contact_raw": "(11) 98765-4321", "contact_type": "whatsapp"},
            "expected_valid": True,
            "expected_type": "whatsapp",
            "expected_norm": "+5511987654321"
        },
        {
            "desc": "WhatsApp RJ Válido (Formato corrido com 55)",
            "input": {"contact_raw": "5521998877665", "contact_type": "whatsapp"},
            "expected_valid": True,
            "expected_type": "whatsapp",
            "expected_norm": "+5521998877665"
        },
        {
            "desc": "Telefone com DDD Inexistente (05)",
            "input": {"contact_raw": "(05) 98765-4321", "contact_type": "whatsapp"},
            "expected_valid": False,
            "expected_type": "whatsapp"
        },
        {
            "desc": "Telefone Incompleto (<10 dígitos)",
            "input": {"contact_raw": "119876", "contact_type": "whatsapp"},
            "expected_valid": False,
            "expected_type": "whatsapp"
        },
        {
            "desc": "E-mail Válido Padrão",
            "input": {"contact_raw": "leitor.tech@gmail.com", "contact_type": "email"},
            "expected_valid": True,
            "expected_type": "email",
            "expected_norm": "leitor.tech@gmail.com"
        },
        {
            "desc": "E-mail com Maiúsculas e Espaços",
            "input": {"contact_raw": "  DEV.TESTE@EMPRESA.COM.BR  ", "contact_type": "email"},
            "expected_valid": True,
            "expected_type": "email",
            "expected_norm": "dev.teste@empresa.com.br"
        },
        {
            "desc": "E-mail Inválido Sem Domínio",
            "input": {"contact_raw": "usuario@invalido", "contact_type": "email"},
            "expected_valid": False,
            "expected_type": "email"
        },
        {
            "desc": "Lead Completo com Nome e WhatsApp",
            "input": {"name": "Carlos Silva", "contact_raw": "(11) 98765-4321", "contact_type": "whatsapp"},
            "expected_valid": True,
            "expected_type": "whatsapp",
            "expected_norm": "+5511987654321",
            "expected_name": "Carlos Silva"
        }
    ]

    passed = 0
    total = len(test_cases)

    for i, tc in enumerate(test_cases, 1):
        res = process_lead(tc["input"])
        is_val = (res["validation_status"] == "valid")
        type_ok = (res["contact_type"] == tc["expected_type"])
        norm_ok = True
        if tc.get("expected_norm"):
            norm_ok = (res["contact_normalized"] == tc["expected_norm"])
        name_ok = True
        if tc.get("expected_name"):
            name_ok = (res["name"] == tc["expected_name"])

        if is_val == tc["expected_valid"] and type_ok and norm_ok and name_ok:
            print(f" [PASS] Caso {i}: {tc['desc']} -> {res['contact_normalized'] or res['validation_error']}")
            passed += 1
        else:
            print(f" [FAIL] Caso {i}: {tc['desc']}")
            print(f"        Esperado: valid={tc['expected_valid']}, norm={tc.get('expected_norm')}")
            print(f"        Obtido:   valid={is_val}, norm={res['contact_normalized']}, erro={res['validation_error']}")

    # Teste de deduplicação
    dup_input = [
        process_lead({"id": "1", "contact_raw": "11987654321"}),
        process_lead({"id": "2", "contact_raw": "(11) 98765-4321"}), # Duplicata
        process_lead({"id": "3", "contact_raw": "outro@email.com"})
    ]
    deduped = deduplicate_leads(dup_input)
    dup_test_pass = (deduped[0]["is_duplicate"] is False and 
                     deduped[1]["is_duplicate"] is True and 
                     deduped[2]["is_duplicate"] is False)

    if dup_test_pass:
        print(" [PASS] Caso Deduplicação: Identificou corretamente submissão repetida na janela.")
        passed += 1
    else:
        print(" [FAIL] Caso Deduplicação falhou!")
    total += 1

    print(f"\nResultado do Self-Test: {passed}/{total} testes aprovados.")
    if passed == total:
        print("STATUS: 100% GREEN")
        return 0
    else:
        print("STATUS: FAILED")
        return 1


def main():
    parser = argparse.ArgumentParser(description="Sincronizador de Leads do Netlify Forms")
    parser.add_argument("--self-test", action="store_true", help="Executa suite de testes sintéticos locais")
    parser.add_argument("--site-id", default=os.getenv("NETLIFY_SITE_ID"), help="Netlify Site ID")
    parser.add_argument("--token", default=os.getenv("NETLIFY_AUTH_TOKEN"), help="Netlify Personal Access Token")
    parser.add_argument("--form-name", default="kit-openbot-leads", help="Nome do formulário")

    args = parser.parse_args()

    if args.self_test:
        code = run_self_test()
        sys.exit(code)

    if not args.token or not args.site_id:
        sys.stderr.write(
            "[AVISO] Credenciais NETLIFY_AUTH_TOKEN e NETLIFY_SITE_ID não configuradas no ambiente.\n"
            "Para executar o teste de integração sem credenciais, use: python3 sync_netlify_leads.py --self-test\n"
        )
        sys.exit(1)

    raw_submissions = fetch_netlify_submissions(args.token, args.site_id, args.form_name)
    processed = [process_lead(s) for s in raw_submissions]
    final_leads = deduplicate_leads(processed)

    print(json.dumps({
        "status": "success",
        "total_fetched": len(raw_submissions),
        "total_processed": len(final_leads),
        "leads": final_leads
    }, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
