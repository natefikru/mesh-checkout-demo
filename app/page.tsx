const steps = [
  { label: "Connect Coinbase through Mesh Link", phase: 3 },
  { label: "Read the portfolio server-side", phase: 4 },
  { label: "Pay in USDC over Ethereum", phase: 5 },
  { label: "Settle on the transfer webhook", phase: 6 },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-10 px-6 py-24">
      <div className="space-y-3">
        <p className="font-mono text-xs uppercase tracking-[0.2em] opacity-50">Mesh Connect sandbox</p>
        <h1 className="text-4xl font-medium tracking-tight">Sole</h1>
        <p className="max-w-md text-base leading-relaxed opacity-70">
          A sneaker storefront that settles in USDC from a connected Coinbase account. Scaffold is
          deployed; the storefront lands next.
        </p>
      </div>

      <ol className="divide-y divide-current/10 border-y border-current/10">
        {steps.map((step) => (
          <li key={step.phase} className="flex items-baseline justify-between gap-4 py-3">
            <span className="text-sm">{step.label}</span>
            <span className="font-mono text-xs opacity-40">phase {step.phase}</span>
          </li>
        ))}
      </ol>
    </main>
  );
}
