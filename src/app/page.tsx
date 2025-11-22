import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AppWindow,
  BarChart,
  QrCode,
  ShieldCheck,
} from 'lucide-react';

const features = [
  {
    icon: QrCode,
    title: 'Effortless QR Code Attendance',
    description:
      'Students can quickly mark their attendance by generating a unique QR code on their registered device, ensuring a seamless and secure check-in process.',
  },
  {
    icon: BarChart,
    title: 'Real-time Monitoring',
    description:
      'Administrators can monitor attendance in real-time, view detailed reports, and track attendance statistics to gain insights into student presence.',
  },
  {
    icon: ShieldCheck,
    title: 'Enhanced Security',
    description:
      'Device registration ensures that only the authorized student can generate a QR code, preventing fraudulent check-ins and maintaining data integrity.',
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-dvh bg-background">
      <header className="sticky top-0 z-40 w-full border-b border-background/50 bg-background/80 backdrop-blur-sm">
        <div className="container flex h-16 items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold font-headline"
          >
            <AppWindow className="h-6 w-6 text-primary" />
            <span>AttendEase</span>
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
        <section className="relative py-20 lg:py-28">
          <div className="container relative z-10 flex flex-col items-center justify-center gap-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <h1 className="text-4xl font-extrabold leading-tight tracking-tighter md:text-5xl lg:text-6xl font-headline">
                A smarter way to manage attendance.
              </h1>
              <p className="max-w-[700px] text-lg text-foreground/80">
                Welcome to AttendEase, the intelligent attendance management
                system designed to streamline your classroom.
              </p>
              <div className="flex gap-4 mt-4">
                <Button size="lg" asChild>
                  <Link href="/register">Get Started</Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                >
                  Learn More
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-background py-20">
          <div className="container">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <Card
                  key={feature.title}
                  className="flex flex-col bg-card/80 backdrop-blur-sm border-border/20 shadow-lg"
                >
                  <CardHeader className="flex flex-col items-center text-center p-6">
                    <div className="p-4 bg-primary/10 rounded-full mb-4">
                      <feature.icon className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-xl font-bold font-headline">
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center p-6 pt-0">
                    <p className="text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="py-6 md:px-8 md:py-0 border-t border-border/20 bg-background">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
          <p className="text-balance text-center text-sm leading-loose text-muted-foreground md:text-left">
            Built by your AI assistant.
          </p>
        </div>
      </footer>
    </div>
  );
}
