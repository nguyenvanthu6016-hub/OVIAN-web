import type { LocalizedBlocks } from "@/lib/cms/types";

export function Blocks({ body }: { body: LocalizedBlocks }) {
  return (
    <div lang={body.lang} className="prose-ovian">
      {body.blocks.map((b, i) => {
        if (b.type === "h2") return <h2 key={i}>{b.text}</h2>;
        if (b.type === "h3") return <h3 key={i}>{b.text}</h3>;
        if (b.type === "ul") return <ul key={i}>{b.items.map((it, j) => <li key={j}>{it}</li>)}</ul>;
        return <p key={i}>{b.text}</p>;
      })}
    </div>
  );
}
