import {
  contactSchema,
  fieldErrors,
  fields,
  type ContactErrors,
} from '../../lib/contact/schema';
import { t } from '../../i18n/content';
import type { Locale } from '../../i18n/routing';

class ContactForm extends HTMLElement {
  connectedCallback() {
    const form = this.querySelector('form')!;
    const locale = this.dataset.locale as Locale;
    const submit = form.querySelector<HTMLButtonElement>(
      'button[type="submit"]',
    )!;
    const failure = this.querySelector<HTMLElement>('.failure')!;
    const summary = this.querySelector<HTMLElement>('.summary')!;
    const success = this.querySelector<HTMLElement>('.success')!;
    let sending = false;
    const showErrors = (errors: ContactErrors, only?: string) => {
      for (const field of fields) {
        if (only && field !== only) continue;
        const control = form.elements.namedItem(field);
        const error = this.querySelector<HTMLElement>(`#${field}-error`);
        if (error) error.textContent = errors[field] ?? '';
        if (control instanceof HTMLElement) {
          control.setAttribute('aria-invalid', String(Boolean(errors[field])));
          if (error) control.setAttribute('aria-describedby', error.id);
          const wrapper = control.closest<HTMLElement>('.field');
          if (wrapper) wrapper.dataset.bad = String(Boolean(errors[field]));
        }
      }
      if (!only) {
        summary.textContent = Object.values(errors).join(' ');
        summary.hidden = !Object.keys(errors).length;
      }
    };
    const validate = () => {
      const parsed = contactSchema.safeParse(
        Object.fromEntries(new FormData(form)),
      );
      return parsed.success ? {} : fieldErrors(parsed.error, locale);
    };
    form.addEventListener('focusout', (event) => {
      const input = event.target;
      if (
        input instanceof HTMLInputElement ||
        input instanceof HTMLTextAreaElement
      )
        showErrors(validate(), input.name);
    });
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (sending) return;
      failure.hidden = true;
      const errors = validate();
      showErrors(errors);
      if (Object.keys(errors).length) {
        summary.focus();
        return;
      }
      sending = true;
      submit.disabled = true;
      submit.textContent = t(locale, 'contact.form.loading');
      form.setAttribute('aria-busy', 'true');
      try {
        const response = await fetch(form.action, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(Object.fromEntries(new FormData(form))),
        });
        const result = await response.json();
        if (response.ok && result.ok === true) {
          form.hidden = true;
          success.hidden = false;
          success.focus();
        } else if (response.status === 400 && result.errors) {
          showErrors(result.errors);
          summary.focus();
        } else throw new Error('Delivery failed');
      } catch {
        failure.hidden = false;
        failure.focus();
      } finally {
        sending = false;
        submit.disabled = false;
        form.removeAttribute('aria-busy');
        submit.textContent = t(
          locale,
          failure.hidden ? 'contact.form.submit' : 'contact.form.retry',
        );
      }
    });
  }
}
customElements.define('contact-form', ContactForm);
