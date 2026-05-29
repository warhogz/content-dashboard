"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);

    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      toast.push({
        title: "Supabase не настроен",
        description: "Проверь env-файл"
      });
      setPending(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    setPending(false);

    if (error) {
      toast.push({
        title: "Ошибка входа",
        description: error.message
      });
      return;
    }

    toast.push({
      title: "Успешный вход"
    });

    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="page-shell flex min-h-[calc(100vh-4rem)] items-center justify-center py-10">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-5 p-6">
          <div>
            <CardTitle>Вход в админ-панель</CardTitle>
            <CardDescription className="mt-1">
              Вход по email и паролю
            </CardDescription>
          </div>

          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="Email"
          />

          <Input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Пароль"
          />

          <Button
            className="w-full"
            onClick={submit}
            disabled={pending || !email || !password}
          >
            {pending ? "Входим..." : "Войти"}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
