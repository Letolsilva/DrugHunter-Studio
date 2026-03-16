// pages/AuthPage/AuthPage.tsx
import { useAuthPage } from "./useAuthPage";
import AuthTemplate from "../../templates/auth/AuthTemplate";

export default function AuthPage() {
  const props = useAuthPage();
  return <AuthTemplate {...props} />;
}
