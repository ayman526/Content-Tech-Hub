"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";

const FAQS = [
  {
    q: "What is Contentech?",
    a: "Contentech is an enterprise content platform that combines AI automation with certified linguists. You can use our platform credits, bring your own API keys, invite your own in-house creators, or connect a private on-premises language model — all in one workspace with shared content memory and glossary.",
  },
  {
    q: "What does 'Bring Your Own Keys' (BYOK) mean?",
    a: "BYOK means you connect your own OpenAI, Anthropic, or Azure AI API credentials to Contentech. Your documents are processed under your account — so your content never touches a shared endpoint, is never stored by us, and is never used to train or improve any public AI model. You retain full billing control and data sovereignty.",
  },
  {
    q: "Can I invite my in-house translators to the platform?",
    a: "Yes. You can invite your in-house linguists, subject-matter experts, or preferred vendors directly into your Contentech workspace. They join your organization, share your Translation Memory and Glossary, and can be assigned jobs through the platform. You control their roles (translator, reviewer, or manager) and maintain a full activity audit trail.",
  },
  {
    q: "Can I run my own LLM instead of a public AI model?",
    a: "Yes. For organizations with classified or regulated content, you can point Contentech at a privately-hosted or on-premises language model — including Llama, Mistral, a private Azure OpenAI endpoint, or any OpenAI-compatible API server. This ensures content never leaves your infrastructure.",
  },
  {
    q: "How does the AI + Human hybrid workflow work?",
    a: "You upload a document through the chat-based wizard, and our AI generates a high-quality first draft using your preferred model. The draft is then assigned to a matched human linguist who reviews, refines, and approves each segment using your Translation Memory and Glossary. The result is AI speed with human precision.",
  },
  {
    q: "What languages do you support?",
    a: "We support over 180 languages, with strong specialist coverage for Arabic (MSA and regional dialects), French, German, Spanish, Japanese, Chinese, Turkish, and all major European and MENA languages. Our linguist network includes certified specialists in legal, medical, and technical domains.",
  },
  {
    q: "How is pricing calculated?",
    a: "Pricing depends on your workflow choice. BYOK users pay only for platform access (Starter is free). Platform-credit users purchase credit packages and pay per word. Human-only jobs use our transparent rate card based on language pair and domain. Enterprise plans include dedicated linguist teams and custom SLAs.",
  },
  {
    q: "Is Contentech compliant with GDPR and HIPAA?",
    a: "Yes. When using BYOK or on-prem LLM mode, your content is processed entirely within your own infrastructure. We do not retain document content after processing. For full compliance requirements, our Enterprise plan includes DPA agreements, SSO/SAML, and custom data residency options.",
  },
];

export function HomeFAQ({ items }: { items?: Array<{ q: string; a: string }> }) {
  const [open, setOpen] = useState<number | null>(null);
  const list = (items && items.length > 0) ? items : FAQS;

  return (
    <div className="divide-y divide-gray-200">
      {list.map((faq, i) => (
        <div key={i}>
          <button
            className="flex items-center justify-between w-full text-left gap-6 py-5"
            onClick={() => setOpen(open === i ? null : i)}
            data-testid={`faq-item-${i}`}
          >
            <span className="text-base font-semibold" style={{ color: "#33475B" }}>{faq.q}</span>
            <span
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              style={open === i
                ? { background: "#FFF1EC", color: "#FF7A59" }
                : { background: "#F5F8FA", color: "#99ACC2" }}
            >
              {open === i ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </span>
          </button>
          {open === i && (
            <div className="pb-5">
              <p className="text-sm leading-relaxed max-w-3xl" style={{ color: "#516F90" }}>{faq.a}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
