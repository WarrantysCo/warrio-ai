"use client";

import { useRef, useState, useSyncExternalStore } from "react";

import GetPlanBox from "./components/GetPlanBox";
import SiteFooter from "./components/SiteFooter";
import SiteHeader from "./components/SiteHeader";

import { contact } from "./data/contact";
import { priceCategories } from "./data/priceList";
import { getCategory, lowestPrice } from "./lib/agents/sales/pricing";
import type { SalesAnalysis } from "./lib/agents/sales/types";

type JourneyStep =
  | "chat"
  | "recommendation"
  | "options"
  | "eligibility"
  | "details"
  | "summary"
  | "success";

type CustomerDetails = {
  fullName: string;
  mobile: string;
  email: string;
  brand: string;
  model: string;
  serialNumber: string;
  purchaseDate: string;
  consent: boolean;
};

const emptyCustomerDetails: CustomerDetails = {
  fullName: "",
  mobile: "",
  email: "",
  brand: "",
  model: "",
  serialNumber: "",
  purchaseDate: "",
  consent: false,
};

// Product cards shown on the home page; every other category in the price
// list is still sold through "Other Product".
const featuredProducts: { id: string; label: string }[] = [
  { id: "mobile", label: "Mobile Phone" },
  { id: "tv", label: "TV" },
  { id: "laptop", label: "Laptop" },
  { id: "ac", label: "Air Conditioner" },
  { id: "refrigerator", label: "Refrigerator" },
  { id: "washing-machine", label: "Washing Machine" },
  { id: "water-purifier", label: "Water Purifier" },
  { id: "small-appliance", label: "Small Appliances" },
];

const products = [
  ...featuredProducts.flatMap(({ id, label }) => {
    const category = priceCategories.find((entry) => entry.id === id);
    return category
      ? [
          {
            name: label,
            icon: category.icon,
            price: `From ₹${lowestPrice(category).toLocaleString("en-IN")}`,
          },
        ]
      : [];
  }),
  {
    name: "Other Product",
    icon: "🛡️",
    price: "Ask Warrio",
  },
];

// Other pages link to /#ask to open the chat straight away.
const subscribeToHash = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
};
const isAskHash = () => window.location.hash === "#ask";

const quickQuestions = [
  "📎 Upload Invoice to Get Best Plan Options",
  "🔍 Check What's Covered",
  "🔧 I Need Help With a Breakdown",
  "📋 Understand My Warranty",
  "💬 Ask Warrio Something Else",
];

export default function Home() {
  const [question, setQuestion] = useState("");
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const askedByLink = useSyncExternalStore(subscribeToHash, isAskHash, () => false);
  const [askLinkDismissed, setAskLinkDismissed] = useState(false);
  const isChatOpen = chatOpen || (askedByLink && !askLinkDismissed);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [answer, setAnswer] = useState("");
  const [isAnalyzingInvoice, setIsAnalyzingInvoice] = useState(false);
  const [invoiceAnalysis, setInvoiceAnalysis] =
    useState<SalesAnalysis | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [journeyStep, setJourneyStep] = useState<JourneyStep>("chat");
  const [customerDetails, setCustomerDetails] =
    useState<CustomerDetails>(emptyCustomerDetails);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);
  const [leadReference, setLeadReference] = useState("");
  const [paymentUrl, setPaymentUrl] = useState("");
  const [leadError, setLeadError] = useState("");
  const invoiceAnalysisRequestIdRef = useRef(0);

  const planOptions = invoiceAnalysis?.plan_options ?? [];
  const selectedPlan = planOptions.find((plan) => plan.id === selectedPlanId);
  const productName =
    getCategory(invoiceAnalysis?.invoice.product_category ?? "")?.name ??
    "product";

  const updateCustomerDetail = <K extends keyof CustomerDetails>(
    field: K,
    value: CustomerDetails[K]
  ) => {
    setCustomerDetails((current) => ({ ...current, [field]: value }));
    setFormErrors([]);
    setLeadError("");
  };

  const validateCustomerDetails = () => {
    const errors: string[] = [];
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const mobilePattern = /^[6-9]\d{9}$/;

    if (!selectedPlan) errors.push("Please select one plan.");
    if (!customerDetails.fullName.trim()) {
      errors.push("Please enter your full name.");
    }
    if (!mobilePattern.test(customerDetails.mobile.trim())) {
      errors.push("Please enter a valid 10-digit mobile number.");
    }
    if (!emailPattern.test(customerDetails.email.trim())) {
      errors.push("Please enter a valid email address.");
    }
    if (!customerDetails.brand.trim()) {
      errors.push("Please enter the product brand.");
    }
    if (!customerDetails.model.trim()) {
      errors.push("Please enter the product model.");
    }
    if (!customerDetails.serialNumber.trim()) {
      errors.push("Please enter the product serial number.");
    }
    if (!customerDetails.purchaseDate) {
      errors.push("Please enter the purchase date.");
    }
    if (!customerDetails.consent) {
      errors.push("Please confirm that you want to proceed with this plan.");
    }

    return errors;
  };

  const continueToDetails = () => {
    if (!selectedPlan || invoiceAnalysis?.eligibility_status !== "eligible") {
      setFormErrors(["Please select one plan."]);
      return;
    }

    setJourneyStep("details");
    setFormErrors([]);
  };

  const reviewOrder = () => {
    const errors = validateCustomerDetails();
    setFormErrors(errors);

    if (errors.length === 0) setJourneyStep("summary");
  };

  const submitLead = async () => {
    const errors = validateCustomerDetails();
    setFormErrors(errors);

    if (errors.length > 0 || !selectedPlan) return;

    setIsSubmittingLead(true);
    setLeadError("");

    try {
      const formData = new FormData();
      formData.append("fullName", customerDetails.fullName.trim());
      formData.append("mobile", customerDetails.mobile.trim());
      formData.append("email", customerDetails.email.trim());
      formData.append("brand", customerDetails.brand.trim());
      formData.append("model", customerDetails.model.trim());
      formData.append("serialNumber", customerDetails.serialNumber.trim());
      formData.append("purchaseDate", customerDetails.purchaseDate);
      formData.append("selectedPlanId", selectedPlan.id);
      formData.append("priceInr", String(invoiceAnalysis?.invoice.price_inr ?? ""));
      formData.append("analysis", JSON.stringify(invoiceAnalysis));
      formData.append("consent", String(customerDetails.consent));

      if (invoiceFile) formData.append("invoice", invoiceFile, invoiceFile.name);

      const response = await fetch("/api/leads", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      if (!response.ok || !result?.success) {
        setLeadError(result?.message || "We could not create your request.");
        return;
      }

      setLeadReference(result.leadReference);
      setPaymentUrl(typeof result.paymentUrl === "string" ? result.paymentUrl : "");
      setJourneyStep("success");
    } catch {
      setLeadError("We could not create your request. Please try again.");
    } finally {
      setIsSubmittingLead(false);
    }
  };

  const openWarrio = (message = "") => {
    setQuestion(message);
    setChatOpen(true);
  };


  // fileOverride lets a freshly picked invoice be reviewed straight away,
  // before the invoiceFile state update has landed.
  const submitQuestion = async (fileOverride?: File) => {
    const invoice = fileOverride ?? invoiceFile;
    const trimmedQuestion = question.trim();
    const hasInvoice = Boolean(invoice);
    let requestId = 0;

    if (!trimmedQuestion && !hasInvoice) {
      return;
    }

    if (hasInvoice && isAnalyzingInvoice) {
      return;
    }

    try {
      let response: Response;
      requestId = hasInvoice
        ? ++invoiceAnalysisRequestIdRef.current
        : invoiceAnalysisRequestIdRef.current;

      if (hasInvoice && invoice) {
        setIsAnalyzingInvoice(true);
        setAnswer("");

        const formData = new FormData();
        formData.append(
          "message",
          trimmedQuestion ||
            "Please analyze this invoice and recommend the available warranty options."
        );
        formData.append("invoice", invoice, invoice.name);

        if (selectedProduct) {
          formData.append("selectedProduct", selectedProduct);
        }

        response = await fetch("/api/warrio", {
          method: "POST",
          body: formData,
        });
      } else {
        response = await fetch("/api/warrio", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: trimmedQuestion,
            selectedProduct: selectedProduct || undefined,
          }),
        });
      }

      const result = await response.json();

      if (hasInvoice && requestId !== invoiceAnalysisRequestIdRef.current) {
        return;
      }

      if (!response.ok || !result?.success) {
        if (hasInvoice) {
          setAnswer(
            result?.message ||
              "Warrio couldn't review that invoice right now. Please try again."
          );
        } else {
          setAnswer(
            result?.message ||
              "Warrio is temporarily unavailable. Please try again."
          );
        }
        return;
      }

      setQuestion("");
      setAnswer(result.message);

      if (result.analysis) {
        const analysis = result.analysis as SalesAnalysis;
        const invoice = analysis.invoice;

        setInvoiceAnalysis(analysis);
        setSelectedProduct(getCategory(invoice.product_category)?.name || "");
        setSelectedPlanId(analysis.recommended_plan_id || "");
        setCustomerDetails((current) => ({
          ...current,
          fullName: current.fullName || invoice.name_on_invoice || "",
          brand: invoice.brand || current.brand,
          model: invoice.model || current.model,
          serialNumber: invoice.serial_or_imei || current.serialNumber,
          purchaseDate: invoice.invoice_date || current.purchaseDate,
        }));
        setJourneyStep(
          analysis.eligibility_status === "eligible"
            ? "recommendation"
            : "eligibility"
        );
      }
    } catch {
      if (hasInvoice) {
        setAnswer("Warrio couldn't review that invoice right now. Please try again.");
      } else {
        setAnswer("Warrio is temporarily unavailable. Please try again.");
      }
    } finally {
      if (hasInvoice && requestId === invoiceAnalysisRequestIdRef.current) {
        setIsAnalyzingInvoice(false);
      }
    }
  };

  // Picking an invoice anywhere on the page opens Warrio and starts the review.
  const reviewInvoice = (file: File | null) => {
    setInvoiceFile(file);
    if (!file) return;
    setChatOpen(true);
    setJourneyStep("chat");
    setInvoiceAnalysis(null);
    setFormErrors([]);
    setLeadError("");
    void submitQuestion(file);
  };

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <SiteHeader onAskWarrio={() => openWarrio()} />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(30,139,232,0.14),transparent_45%)]" />

        <div className="relative mx-auto grid max-w-7xl gap-12 px-6 py-12 lg:grid-cols-2 lg:items-center lg:py-16">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-green bg-brand-green/15 px-4 py-2 text-sm font-semibold text-brand-green-dark">
              <span className="h-2 w-2 rounded-full bg-brand-green-dark" />
              AI-powered warranty assistance
            </div>

            <h1 className="max-w-3xl text-5xl font-black leading-tight tracking-tight md:text-6xl">
              Protect what you own.
              <span className="block text-brand-blue">
                Let Warrio handle the rest.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-700">
              Get help understanding your warranty, protect eligible products,
              register your purchase and get claim assistance - all from one
              intelligent warranty platform.
            </p>

            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <button
                type="button"
                onClick={() => openWarrio("I want to protect my product")}
                className="rounded-2xl bg-brand-blue px-7 py-4 font-bold shadow-xl shadow-brand-blue/20 transition hover:-translate-y-0.5 hover:bg-brand-blue-dark text-white"
              >
                🛡️ Protect My Product
              </button>

              <button
                type="button"
                onClick={() => openWarrio()}
                className="rounded-2xl border border-slate-300 bg-slate-50 px-7 py-4 font-bold backdrop-blur transition hover:bg-slate-100"
              >
                🤖 Ask Warrio
              </button>
            </div>

            <div className="mt-8 flex flex-wrap gap-5 text-sm text-slate-600">
              <span>✓ Warranty assistance</span>
              <span>✓ Product registration</span>
              <span>✓ Claim support</span>
            </div>
          </div>

          {/* On phones the plan box comes first, so customers can start straight away. */}
          <div className="order-first mx-auto w-full max-w-lg lg:order-none">
            <GetPlanBox
              onInvoice={reviewInvoice}
              onSelectProduct={(productName) => {
                setSelectedProduct(productName);
                setSelectedPlanId("");
              }}
            />
          </div>
        </div>
      </section>

      <section id="protect" className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-10 max-w-2xl">
            <div className="text-sm font-semibold uppercase tracking-wider text-brand-blue">
              Protect your product
            </div>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">
              What do you want to protect?
            </h2>
            <p className="mt-4 text-slate-600">
              Choose a product and Warrio will guide you through the next step.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <button
                key={product.name}
                onClick={() => {
                  setSelectedProduct(product.name);
                  setSelectedPlanId("");
                  setJourneyStep("chat");
                  setFormErrors([]);
                  setLeadError("");
                  openWarrio(`I want to protect my ${product.name}`);
                }}
                className="group rounded-3xl border border-slate-200 bg-white p-6 text-left transition hover:-translate-y-1 hover:border-blue-500/40 hover:bg-blue-50"
              >
                <div className="flex items-start justify-between">
                  <span className="text-4xl">{product.icon}</span>
                  <span className="text-sm text-slate-500 transition group-hover:text-brand-blue">
                    →
                  </span>
                </div>

                <div className="mt-6 text-lg font-bold">{product.name}</div>
                <div className="mt-2 text-sm text-slate-600">
                  {product.price}
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <div className="text-sm font-semibold uppercase tracking-wider text-brand-blue">
              Simple
            </div>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">
              Warranty support without the headache
            </h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                number: "01",
                title: "Tell Warrio",
                text: "Tell us what product you own or what problem you're facing.",
              },
              {
                number: "02",
                title: "Get guidance",
                text: "Warrio helps you understand your available warranty options and next steps.",
              },
              {
                number: "03",
                title: "Take action",
                text: "Register, protect, raise a claim or connect with support.",
              },
            ].map((step) => (
              <div
                key={step.number}
                className="rounded-3xl border border-slate-200 bg-white p-7"
              >
                <div className="text-sm font-bold text-brand-blue">
                  {step.number}
                </div>
                <h3 className="mt-5 text-xl font-bold">{step.title}</h3>
                <p className="mt-3 leading-7 text-slate-600">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="support" className="px-6 pb-20">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl border border-blue-500/20 bg-blue-50 p-8 md:p-12">
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-center">
            <div>
              <h2 className="text-3xl font-bold">Not sure what you need?</h2>
              <p className="mt-3 max-w-xl text-slate-600">
                Ask Warrio. It&apos;s built to help you understand your
                warranty options before you make a decision.
              </p>
            </div>

              <button
                type="button"
                onClick={() => openWarrio("I need help choosing the right warranty")}
                className="shrink-0 rounded-2xl bg-brand-blue px-7 py-4 font-bold hover:bg-brand-blue-dark text-white"
              >
                Talk to Warrio →
              </button>
          </div>
        </div>
      </section>

      <SiteFooter />

      {isChatOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-sm md:items-center">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold">🛡️ Warrio AI</div>
                <div className="text-xs text-slate-500">Warranty assistant</div>
              </div>

              <button
                onClick={() => {
                  setChatOpen(false);
                  setAskLinkDismissed(true);
                }}
                className="rounded-full bg-slate-100 px-3 py-2 text-slate-700 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 rounded-2xl bg-slate-100 p-4 text-sm leading-6 text-slate-700">
              {selectedProduct
                ? `Great - let's look at protection options for your ${selectedProduct}.`
                : "Tell me what you need help with and I'll guide you."}
            </div>

            {journeyStep === "success" ? (
              <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-5 text-sm leading-6 text-emerald-900">
                <div className="text-base font-bold">
                  Your warranty request has been created successfully.
                </div>
                <div className="mt-3">Lead reference: {leadReference}</div>
                <div>Selected plan: {selectedPlan?.plan_name}</div>
                <div>
                  Price: ₹{selectedPlan?.price_inr.toLocaleString("en-IN")}
                </div>
                {paymentUrl ? (
                  <a
                    href={paymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 block rounded-xl bg-brand-blue py-3 text-center text-base font-bold text-white transition hover:bg-brand-blue-dark"
                  >
                    Pay ₹{selectedPlan?.price_inr.toLocaleString("en-IN")} securely →
                  </a>
                ) : (
                  <a
                    href={`${contact.whatsappHref}?text=${encodeURIComponent(
                      `Hello Warrantys.co, I'd like to pay for my plan. Reference: ${leadReference}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 block rounded-xl bg-[#25D366] py-3 text-center text-base font-bold text-white transition hover:opacity-90"
                  >
                    Get your payment link on WhatsApp →
                  </a>
                )}
                <p className="mt-2 text-xs text-emerald-900/80">
                  {paymentUrl
                    ? "Opens Razorpay's secure payment page. We never ask for card details or OTP on chat."
                    : "Our team will send you a secure payment link on WhatsApp."}
                </p>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-sm font-semibold text-brand-blue">
                  {journeyStep === "chat"
                    ? "Start with your purchase invoice"
                    : journeyStep === "recommendation"
                      ? "Warrio's recommendation"
                      : journeyStep === "options"
                        ? "Other verified options"
                        : journeyStep === "eligibility"
                          ? "Eligibility review"
                    : journeyStep === "details"
                      ? "Customer details"
                      : "Review your request"}
                </div>

                {journeyStep === "chat" && !invoiceAnalysis && (
                  <>
                    <p className="mt-3 text-sm leading-6 text-slate-700">
                      Upload your purchase invoice and Warrio will check the product,
                      purchase date and available protection options for you.
                    </p>
                    <button
                      type="button"
                      onClick={() => document.getElementById("invoice-upload")?.click()}
                      className="mt-4 w-full rounded-xl bg-brand-blue py-3 font-semibold transition hover:bg-brand-blue-dark text-white"
                    >
                      Upload purchase invoice
                    </button>
                  </>
                )}

                {invoiceAnalysis && journeyStep === "recommendation" && selectedPlan && (
                  <>
                    <div className="mt-3 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-800">
                      <div className="whitespace-pre-line">{answer}</div>
                      <div className="mt-3 font-semibold text-brand-blue">
                        Recommended: {selectedPlan.plan_name} · ₹
                        {selectedPlan.price_inr.toLocaleString("en-IN")}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={continueToDetails}
                      className="mt-4 w-full rounded-xl bg-brand-blue py-3 font-semibold transition hover:bg-brand-blue-dark text-white"
                    >
                      Generate Secure Payment Link
                    </button>
                    <button
                      type="button"
                      onClick={() => setJourneyStep("options")}
                      className="mt-2 w-full rounded-xl border border-slate-200 py-3 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      View Other Plans
                    </button>
                  </>
                )}

                {invoiceAnalysis && journeyStep === "options" && (
                  <>
                    <p className="mt-3 text-sm leading-6 text-slate-700">
                      These are the other verified {productName} options. Coverage does not
                      change unless the verified plan data says otherwise.
                    </p>
                    <div className="mt-3 space-y-2">
                      {planOptions
                        .filter((plan) => plan.id !== invoiceAnalysis.recommended_plan_id)
                        .map((plan) => (
                          <button
                            type="button"
                            key={plan.id}
                            onClick={() => {
                              setSelectedPlanId(plan.id);
                              setJourneyStep("details");
                            }}
                            className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left hover:bg-slate-50"
                          >
                            <span>{plan.label} · shorter commitment / lower upfront option</span>
                            <span className="font-semibold">₹{plan.price_inr.toLocaleString("en-IN")}</span>
                          </button>
                        ))}
                    </div>
                  </>
                )}

                {invoiceAnalysis && journeyStep === "eligibility" && (
                  <div className="mt-3 whitespace-pre-line rounded-xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm leading-6 text-amber-900">
                    {invoiceAnalysis.reply}
                  </div>
                )}

                {journeyStep === "details" && (
                  <div className="mt-4 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input aria-label="Full name" placeholder="Full name" value={customerDetails.fullName} onChange={(event) => updateCustomerDetail("fullName", event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-blue-500" />
                      <input aria-label="Mobile number" type="tel" placeholder="Mobile number" value={customerDetails.mobile} onChange={(event) => updateCustomerDetail("mobile", event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-blue-500" />
                      <input aria-label="Email" type="email" placeholder="Email" value={customerDetails.email} onChange={(event) => updateCustomerDetail("email", event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-blue-500 sm:col-span-2" />
                      <input aria-label="Brand" placeholder="Brand" value={customerDetails.brand} onChange={(event) => updateCustomerDetail("brand", event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-blue-500" />
                      <input aria-label="Model" placeholder="Model" value={customerDetails.model} onChange={(event) => updateCustomerDetail("model", event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-blue-500" />
                      <input aria-label="Serial number" placeholder="Serial number" value={customerDetails.serialNumber} onChange={(event) => updateCustomerDetail("serialNumber", event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-blue-500" />
                      <input aria-label="Purchase date" type="date" value={customerDetails.purchaseDate} onChange={(event) => updateCustomerDetail("purchaseDate", event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none focus:border-blue-500" />
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
                      <button type="button" onClick={() => document.getElementById("invoice-upload")?.click()} className="font-semibold text-brand-blue hover:text-brand-blue-dark">
                        {invoiceFile ? "Replace invoice" : "Upload invoice"}
                      </button>
                      <span className="ml-2">{invoiceFile ? invoiceFile.name : "(optional for this V1)"}</span>
                    </div>

                    <label className="flex gap-3 text-sm leading-6 text-slate-700">
                      <input type="checkbox" checked={customerDetails.consent} onChange={(event) => updateCustomerDetail("consent", event.target.checked)} className="mt-1" />
                      <span>I want to proceed with the selected {productName} warranty plan.</span>
                    </label>

                    <button type="button" onClick={reviewOrder} className="w-full rounded-xl bg-brand-blue py-3 font-semibold transition hover:bg-brand-blue-dark text-white">
                      Review request
                    </button>
                  </div>
                )}

                {journeyStep === "summary" && selectedPlan && (
                  <div className="mt-4 space-y-2 text-sm text-slate-700">
                    <div className="rounded-xl bg-slate-50 p-4 leading-7">
                      <div>Customer: {customerDetails.fullName}</div>
                      <div>Product: {selectedPlan.category_name}</div>
                      <div>Brand/model: {customerDetails.brand} / {customerDetails.model}</div>
                      <div>Selected plan: {selectedPlan.label}</div>
                      <div>Price: ₹{selectedPlan.price_inr.toLocaleString("en-IN")}</div>
                      <div>Purchase date: {customerDetails.purchaseDate}</div>
                      <div>Invoice: {invoiceFile ? invoiceFile.name : "Not uploaded"}</div>
                      <div>Mobile/email: {customerDetails.mobile} / {customerDetails.email}</div>
                    </div>
                    {leadError && <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-red-800">{leadError}</div>}
                    <button type="button" onClick={submitLead} disabled={isSubmittingLead} className="w-full rounded-xl bg-brand-blue py-3 font-semibold transition hover:bg-brand-blue-dark disabled:cursor-not-allowed disabled:opacity-60 text-white">
                      {isSubmittingLead ? "Creating request..." : "Proceed to Purchase"}
                    </button>
                    <button type="button" onClick={() => setJourneyStep("details")} className="w-full rounded-xl border border-slate-200 py-3 text-sm text-slate-700 hover:bg-slate-50">
                      Edit details
                    </button>
                  </div>
                )}

                {formErrors.length > 0 && (
                  <div className="mt-3 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm leading-6 text-red-800">
                    {formErrors.map((error) => <div key={error}>{error}</div>)}
                  </div>
                )}
              </div>
            )}

            {journeyStep === "chat" && isAnalyzingInvoice ? (
              <div className="mt-4 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm leading-6 text-blue-900">
                Warrio is reviewing your invoice...
              </div>
            ) : journeyStep === "chat" && answer ? (
              <div className="mt-4 max-h-56 overflow-y-auto rounded-2xl bg-slate-100 p-4 text-sm leading-6 text-slate-800 whitespace-pre-wrap select-text">
                {answer}
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-2">
              {quickQuestions.map((item) => (
                <button
                  type="button"
                  key={item}
                  onClick={() => {
                    if (item.includes("Upload Invoice")) {
                      document.getElementById("invoice-upload")?.click();
                      return;
                    }

                    if (item.includes("Check What's Covered")) {
                      setQuestion(
                        "Please explain what is covered under the available warranty plans."
                      );
                      return;
                    }

                    if (item.includes("Breakdown")) {
                      setQuestion("I need help with a product breakdown.");
                      return;
                    }

                    if (item.includes("Understand My Warranty")) {
                      setQuestion(
                        "Please explain my warranty and the important terms I should know."
                      );
                      return;
                    }

                    if (item.includes("Ask Warrio")) {
                      setQuestion("");
                      return;
                    }

                    setQuestion(item);
                  }}
                  className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-700 hover:bg-slate-100"
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                id="invoice-upload"
                onChange={(e) => {
                  reviewInvoice(e.target.files?.[0] || null);
                  e.target.value = "";
                }}
              />

              {invoiceFile && (
                <div className="mb-2 w-full rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm text-brand-blue">
                  📎 Invoice selected:{" "}
                  <span className="font-semibold">{invoiceFile.name}</span>
                  {isAnalyzingInvoice && (
                    <div className="mt-1 text-xs text-blue-800">
                      Reviewing this invoice now.
                    </div>
                  )}
                </div>
              )}

              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void submitQuestion();
                  }
                }}
                placeholder="Ask Warrio anything..."
                rows={1}
                className="min-h-[48px] min-w-0 flex-1 resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-blue-500"
              />

              <button
                type="button"
                onClick={() => void submitQuestion()}
                disabled={isAnalyzingInvoice && Boolean(invoiceFile)}
                className="rounded-2xl bg-brand-blue px-5 font-bold hover:bg-brand-blue-dark text-white"
              >
                {isAnalyzingInvoice && invoiceFile ? "..." : "→"}
              </button>
            </div>

            <p className="mt-4 text-center text-xs text-slate-400">
              Warrio will use verified warranty information when connected to
              the production system.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
