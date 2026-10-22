"use client";
import {
  useId,
  useState,
  type FormHTMLAttributes,
  type FormEvent,
} from "react";
import { tr } from "@/i18n/core";

/** Native constraints, app-owned messages; no browser validation bubble. */
export function Form({
  onSubmit,
  children,
  ...props
}: FormHTMLAttributes<HTMLFormElement>) {
  const id = useId();
  const [error, setError] = useState("");
  const submit = (event: FormEvent<HTMLFormElement>) => {
    const form = event.currentTarget;
    for (const element of Array.from(form.elements)) {
      if (
        !(
          element instanceof HTMLInputElement ||
          element instanceof HTMLTextAreaElement ||
          element instanceof HTMLSelectElement
        )
      )
        continue;
      element.removeAttribute("aria-invalid");
      const describedBy = (element.getAttribute("aria-describedby") ?? "")
        .split(/\s+/)
        .filter((value) => value && value !== id);
      if (describedBy.length)
        element.setAttribute("aria-describedby", describedBy.join(" "));
      else element.removeAttribute("aria-describedby");
    }
    const invalid = Array.from(form.elements).find(
      (element) =>
        (element instanceof HTMLInputElement ||
          element instanceof HTMLTextAreaElement ||
          element instanceof HTMLSelectElement) &&
        !element.validity.valid,
    ) as HTMLInputElement | undefined;
    if (invalid) {
      event.preventDefault();
      setError(
        tr(
          invalid.validity.valueMissing
            ? "Complétez le champ indiqué pour continuer."
            : "Vérifiez la valeur du champ indiqué.",
        ),
      );
      invalid.setAttribute("aria-invalid", "true");
      invalid.setAttribute(
        "aria-describedby",
        [invalid.getAttribute("aria-describedby"), id]
          .filter(Boolean)
          .join(" "),
      );
      invalid.focus();
      return;
    }
    setError("");
    onSubmit?.(event);
  };
  return (
    <form {...props} noValidate onSubmit={submit}>
      {error && (
        <p
          id={id}
          role="alert"
          className="rounded-md bg-danger-bg p-4 text-danger"
        >
          {error}
        </p>
      )}
      {children}
    </form>
  );
}
