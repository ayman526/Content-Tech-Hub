import MarketingNav from "@/components/marketing/nav";

export default function ResourcesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MarketingNav />
      <main>{children}</main>
    </>
  );
}
