// == IMPORTS & DEPENDENCIES ==
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// == VALIDATION SCHEMAS ==
const usernameSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
});

const securityAnswerSchema = z.object({
  securityAnswer: z.string().min(1, "Answer is required"),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Confirm password is required"),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// == TYPE DEFINITIONS ==
type UsernameFormValues = z.infer<typeof usernameSchema>;
type SecurityAnswerFormValues = z.infer<typeof securityAnswerSchema>;
type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

// == FORGOT PASSWORD COMPONENT ==
export default function ForgotPassword() {
  
  // == HOOKS & STATE ==
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<'username' | 'security' | 'reset'>('username');
  const [username, setUsername] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // == FORM SETUP ==
  const usernameForm = useForm<UsernameFormValues>({
    resolver: zodResolver(usernameSchema),
    defaultValues: { username: '' },
  });

  const securityForm = useForm<SecurityAnswerFormValues>({
    resolver: zodResolver(securityAnswerSchema),
    defaultValues: { securityAnswer: '' },
  });

  const resetForm = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  // == EVENT HANDLERS ==
  const onUsernameSubmit = async (data: UsernameFormValues) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/forgot-password/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: data.username })
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        setUsername(data.username);
        setSecurityQuestion(result.securityQuestion);
        setStep('security');
        toast({
          title: "Security Question Found",
          description: "Please answer your security question to continue",
        });
      } else {
        throw new Error(result.message || "Username not found or no security question set");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Username not found or no security question set",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSecuritySubmit = async (data: SecurityAnswerFormValues) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/forgot-password/verify-security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          securityAnswer: data.securityAnswer
        })
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        setResetToken(result.resetToken);
        setStep('reset');
        toast({
          title: "Verification Successful",
          description: "You can now reset your password",
        });
      } else {
        throw new Error(result.message || "Incorrect security answer");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Incorrect security answer",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onResetSubmit = async (data: ResetPasswordFormValues) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/forgot-password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          newPassword: data.newPassword,
          confirmPassword: data.confirmPassword,
          resetToken
        })
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        toast({
          title: "Password Reset Successful",
          description: "Your password has been reset. You can now log in with your new password.",
        });
        navigate("/login");
      } else {
        throw new Error(result.message || "Failed to reset password");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to reset password",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // == RENDER COMPONENT ==
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        
        {/* == Header Section == */}
        <div className="text-center">
          <Logo className="mx-auto" />
          <h2 className="mt-6 text-3xl font-bold font-serif text-gray-900">Reset Your Password</h2>
          <p className="mt-2 text-gray-600">
            {step === 'username' && "Enter your username to begin the password reset process"}
            {step === 'security' && "Answer your security question to verify your identity"}
            {step === 'reset' && "Create a new secure password for your account"}
          </p>
        </div>

        {/* == Username Step == */}
        {step === 'username' && (
          <Form {...usernameForm}>
            <form onSubmit={usernameForm.handleSubmit(onUsernameSubmit)} className="mt-8 space-y-6">
              <div className="space-y-4">
                <FormField
                  control={usernameForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter your username"
                          autoComplete="username"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Continue
              </Button>
            </form>
          </Form>
        )}

        {/* == Security Question Step == */}
        {step === 'security' && (
          <Form {...securityForm}>
            <form onSubmit={securityForm.handleSubmit(onSecuritySubmit)} className="mt-8 space-y-6">
              <div className="space-y-4">
                <div className="mb-4">
                  <h3 className="font-medium text-sm">Your Security Question:</h3>
                  <p className="mt-1 text-gray-700">{securityQuestion}</p>
                </div>
                <FormField
                  control={securityForm.control}
                  name="securityAnswer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Answer</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter your answer"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Verify Answer
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full mt-2"
                onClick={() => setStep('username')}
              >
                Back
              </Button>
            </form>
          </Form>
        )}

        {/* == Password Reset Step == */}
        {step === 'reset' && (
          <Form {...resetForm}>
            <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="mt-8 space-y-6">
              <div className="space-y-4">
                <FormField
                  control={resetForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          placeholder="Enter new password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={resetForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          placeholder="Confirm your password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Reset Password
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full mt-2"
                onClick={() => setStep('security')}
              >
                Back
              </Button>
            </form>
          </Form>
        )}

        {/* == Navigation Section == */}
        <div className="mt-6">
          <Link href="/login">
            <Button
              variant="outline"
              className="w-full flex items-center justify-center"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}