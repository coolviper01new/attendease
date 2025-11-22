import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppWindow, BarChart, QrCode, ShieldCheck } from "lucide-react";

const features = [
  {
    icon: QrCode,
    title: "Effortless QR Code Attendance",
    description: "Students can quickly mark their attendance by generating a unique QR code on their registered device, ensuring a seamless and secure check-in process."
  },
  {
    icon: BarChart,
    title: "Real-time Monitoring",
    description: "Administrators can monitor attendance in real-time, view detailed reports, and track attendance statistics to gain insights into student presence."
  },
  {
    icon: ShieldCheck,
    title: "Enhanced Security",
    description: "Device registration ensures that only the authorized student can generate a QR code, preventing fraudulent check-ins and maintaining data integrity."
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold font-headline">
            <AppWindow className="h-6 w-6 text-primary" />
            <span>Crema</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Register</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="container grid items-center gap-6 pb-8 pt-6 md:py-10">
          <div className="flex max-w-[980px] flex-col items-start gap-2">
            <h1 className="text-3xl font-extrabold leading-tight tracking-tighter md:text-5xl lg:text-6xl font-headline">
              A smarter way to manage attendance.
            </h1>
            <p className="max-w-[700px] text-lg text-muted-foreground">
              Welcome to Crema, the intelligent attendance management system designed to streamline your classroom.
            </p>
          </div>
          <div className="flex gap-4">
            <Button asChild>
              <Link href="/login">Get Started</Link>
            </Button>
          </div>
        </section>

        <section className="container pb-8 pt-6 md:py-10">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {features.map((feature) => (
                    <Card key={feature.title} className="flex flex-col">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-base font-medium font-headline">{feature.title}</CardTitle>
                            <feature.icon className="h-5 w-5 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">{feature.description}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </section>
      </main>
      <footer className="py-6 md:px-8 md:py-0 border-t">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
            <p className="text-balance text-center text-sm leading-loose text-muted-foreground md:text-left">
                Built by your AI assistant.
            </p>
        </div>
      </footer>
    </div>
  );
}
