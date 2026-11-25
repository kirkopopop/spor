import { Fragment } from "react";

/** Paragraphs split by blank lines, **bold** inline. Nothing else. */
export function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n{2,}/).map((para, i) => (
        <p key={i} className={i > 0 ? "mt-2" : ""}>
          {para.split(/(\*\*[^*]+\*\*)/).map((part, j) =>
            part.startsWith("**") && part.endsWith("**") ? (
              <b key={j} className="font-semibold text-ink">
                {part.slice(2, -2)}
              </b>
            ) : (
              <Fragment key={j}>{part}</Fragment>
            ),
          )}
        </p>
      ))}
    </>
  );
}
