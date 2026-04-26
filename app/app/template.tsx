import { ThemeProvider } from "@/components/theme-provider";

export default function Template({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>
}