# openbot-kit-lp

Landing page oficial de captura do **Kit Prático: Time de 4 Agentes OpenBot & Fábrica Local de Reels** para a campanha do Reel [@jeanbraga.ia](https://instagram.com/jeanbraga.ia).

## 🚀 Arquitetura & Tecnologias
- **Frontend Estático:** HTML5 semântico, CSS moderno responsivo (Dark-Tech `#0B0F17`, `#00E5FF`, `#00FF94`) e JavaScript vanilla.
- **Formulário de Captura:** Netlify Forms nativo (`kit-openbot-leads`) com detecção automática inteligente de WhatsApp vs E-mail, máscara dinâmica de telefone (DDDs do Brasil) e campos ocultos para rastreamento de UTMs e campanha.
- **Entregável:** `assets/kit-openbot-4-agentes-reels-local.pdf` (7 páginas técnicas, 100% sanitizado com placeholders `fake_xxx`).
- **Automação de Leads:** Script Python local para sincronização e validação das submissões do Netlify Forms (`sync_netlify_leads.py`).

## 📁 Estrutura de Arquivos
```text
├── index.html           # Página principal de captura com formulário inteligente
├── obrigado.html        # Página de download imediato do PDF
├── styles.css           # Estilos dark-tech otimizados para desktop e mobile
├── app.js               # Auto-detecção de contato (WhatsApp / Email) e parsing de UTMs
├── netlify.toml         # Configuração de build e headers de segurança do Netlify
└── assets/
    └── kit-openbot-4-agentes-reels-local.pdf  # PDF oficial de 7 páginas do kit
```

## 💻 Teste Local
Para rodar a landing page localmente sem dependências:
```bash
python3 -m http.server 8000
```
Acesse `http://localhost:8000` no seu navegador.

## 🔄 Rastreamento de Leads (Netlify)
Os formulários enviados no Netlify são sincronizados diretamente pelo script Python local no servidor OpenBot:
```bash
NETLIFY_AUTH_TOKEN="fake_token" NETLIFY_SITE_ID="fake_site" python3 sync_netlify_leads.py
```
Para testar a validação de dados sem credenciais ativas:
```bash
python3 sync_netlify_leads.py --self-test
```

## 🔒 Privacidade e Segurança
Este repositório é 100% sanitizado e não armazena nenhuma credencial, segredo ou dado pessoal sensível.
Co-authored-by: OpenBot <335604065+openbotgit[bot]@users.noreply.github.com>
