"use client";

import { z } from "zod";
import Link from "next/link";
import Image from "next/image";
import Swal from "sweetalert2";
import { auth } from "@/firebase/client";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";

import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { signIn, signUp } from "@/lib/actions/auth.action";
import FormField from "./FormField";

const authFormSchema = (type: FormType) => {
  return z.object({
    name: type === "sign-up" ? z.string().min(3, "Name must be at least 3 characters") : z.string().optional(),
    email: z.string().email("Please enter a valid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
  });
};

const AuthForm = ({ type }: { type: FormType }) => {
  const router = useRouter();

  const formSchema = authFormSchema(type);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const showAlert = (message: string, type: "success" | "error") => {
    Swal.fire({
      title: type === "success" ? "Success!" : "Oops...",
      text: message,
      icon: type,
      confirmButtonColor: type === "success" ? "#2ECC71" : "#E74C3C",
      background: "#1E1E1E",
      color: "#FFF",
      customClass: {
        popup: "rounded-lg shadow-lg",
        title: "text-lg font-bold",
        confirmButton: "py-2 px-4 rounded",
      },
    });
  };

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      if (type === "sign-up") {
        const { name, email, password } = data;

        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

        const result = await signUp({
          uid: userCredential.user.uid,
          name: name!,
          email,
          password,
        });

        if (!result.success) {
          showAlert(result.message, "error");
          return;
        }

        showAlert("Account created successfully! Please sign in.", "success");
        router.push("/sign-in");
      } else {
        const { email, password } = data;

        const userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );

        const idToken = await userCredential.user.getIdToken();
        if (!idToken) {
          showAlert("Sign-in failed. Please try again.", "error");
          return;
        }

        await signIn({ email, idToken });

        showAlert("Signed in successfully!", "success");
        router.push("/");
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      showAlert("Please check your email and password and try again", "error");
    }
  };

  const isSignIn = type === "sign-in";

  return (
    <div className="card-border lg:min-w-[566px]">
      <div className="flex flex-col gap-6 card py-14 px-10">
        <div className="flex flex-row gap-2 justify-center">
          <Image src="/logo.svg" alt="logo" height={32} width={38} />
          <h2 className="text-primary-100">Evalia</h2>
        </div>

        <h3 className="text-center text-xl font-semibold">
          {isSignIn ? "Welcome Back!" : "Create Your Account"}
        </h3>

        <p className="text-center text-gray-400">
          {isSignIn
            ? "Sign in to continue your mock interview journey."
            : "Get started with AI-powered job interview practice."}
        </p>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="w-full space-y-6 mt-4 form"
          >
            {!isSignIn && (
              <FormField
                control={form.control}
                name="name"
                label="Full Name"
                placeholder="Enter your full name"
                type="text"
              />
            )}

            <FormField
              control={form.control}
              name="email"
              label="Email Address"
              placeholder="Enter your email"
              type="email"
            />

            <FormField
              control={form.control}
              name="password"
              label="Password"
              placeholder="Enter your password"
              type="password"
            />

            <Button className="btn w-full py-3 font-semibold" type="submit">
              {isSignIn ? "Sign In" : "Sign Up"}
            </Button>
          </form>
        </Form>

        <p className="text-center text-gray-400">
          {isSignIn ? "Don't have an account?" : "Already have an account?"}
          <Link
            href={!isSignIn ? "/sign-in" : "/sign-up"}
            className="font-bold text-primary-100 ml-1 hover:underline"
          >
            {!isSignIn ? "Sign In" : "Sign Up"}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default AuthForm;
