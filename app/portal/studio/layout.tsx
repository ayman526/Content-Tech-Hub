import StudioQueryProvider from "@/components/studio/query-provider";
import { Toaster } from "sonner";

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StudioQueryProvider>
      {children}
      <Toaster position="top-right" richColors />
    </StudioQueryProvider>
  );
}
