// pages/AuthPage/AuthPage.tsx
import { useAuthPage } from "./useAuthPage";
import AuthTemplate from "../../templates/auth/AuthTemplate";

export default function AuthPage() {
  const {
    modo,
    form,
    erro,
    fieldErrors,
    loading,
    setField,
    trocarModo,
    handleSubmit,
  } = useAuthPage();
  return (
    <AuthTemplate
      modo={modo}
      form={form}
      erro={erro}
      fieldErrors={fieldErrors}
      loading={loading}
      setField={setField}
      trocarModo={trocarModo}
      handleSubmit={handleSubmit}
    />
  );
}
