export function FeatureList({ items }: { items: [term: string, detail: string][] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-3 text-[17px] leading-[1.45]">
      {items.map(([term, detail]) => (
        <div key={term} className="contents">
          <dt className="font-bold">{term}</dt>
          <dd className="text-muted-foreground">{detail}</dd>
        </div>
      ))}
    </dl>
  );
}
