import { Input } from "@/components/ui/input";
import { ActionForm, labelCls } from "@/components/forum/action-form";
import { setNewPassword } from "../actions";

export const metadata = { title: "Neues Passwort – Tachoklar" };

export default function NeuesPasswort() {
  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6 lg:py-16">
      <h1 className="text-4xl font-semibold tracking-[-0.03em]">Neues Passwort</h1>
      <div className="mt-8 rounded-3xl bg-card p-6 sm:p-8">
        <ActionForm action={setNewPassword} submit="Passwort speichern">
          <label className={labelCls}>
            Neues Passwort <span className="font-normal text-muted-foreground">mind. 10 Zeichen, Groß- und Kleinbuchstaben, eine Ziffer</span>
            <Input name="password" type="password" autoComplete="new-password" required minLength={10} className="h-11" />
          </label>
        </ActionForm>
      </div>
    </div>
  );
}
