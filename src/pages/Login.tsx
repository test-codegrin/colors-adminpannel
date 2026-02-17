import { Button, Card, CardBody, Input, InputOtp, REGEXP_ONLY_DIGITS, addToast } from "@heroui/react";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { getLoginErrorMessage, loginAdmin, sendAdminLoginOtp } from "@/api/auth.api";
import { useAuth } from "@/context/AuthContext";
import type { LoginRequest } from "@/types/auth.types";

type LoginMode = "password" | "otp";

interface LoginFormErrors {
  email: string;
  password: string;
  otp: string;
}

const initialErrors: LoginFormErrors = {
  email: "",
  password: "",
  otp: "",
};

function Login() {
  const navigate = useNavigate();
  const { login, token } = useAuth();

  const [mode, setMode] = useState<LoginMode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [errors, setErrors] = useState<LoginFormErrors>(initialErrors);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);

  useEffect(() => {
    if (token) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate, token]);

  useEffect(() => {
    if (otpCooldown <= 0) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [otpCooldown]);

  const validateEmail = (value: string): string => {
    if (!value.trim()) {
      return "Email is required";
    }

    if (!/^\S+@\S+\.\S+$/.test(value)) {
      return "Enter a valid email";
    }

    return "";
  };

  const validate = (): boolean => {
    const nextErrors: LoginFormErrors = { ...initialErrors };
    const emailError = validateEmail(email);

    if (emailError) {
      nextErrors.email = emailError;
    }

    if (mode === "password") {
      if (!password) {
        nextErrors.password = "Password is required";
      } else if (password.length < 6) {
        nextErrors.password = "Password must be at least 6 characters";
      }
    } else {
      if (!otp.trim()) {
        nextErrors.otp = "OTP is required";
      } else if (!/^\d{6}$/.test(otp.trim())) {
        nextErrors.otp = "Enter a valid 6-digit OTP";
      }
    }

    setErrors(nextErrors);

    return !nextErrors.email && !nextErrors.password && !nextErrors.otp;
  };

  const switchMode = (nextMode: LoginMode) => {
    setMode(nextMode);
    setErrors(initialErrors);

    if (nextMode === "password") {
      setOtp("");
    } else {
      setPassword("");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    setIsLoading(true);

    try {
      const payload: LoginRequest =
        mode === "password"
          ? { email: email.trim(), password }
          : { email: email.trim(), otp: otp.trim() };

      const result = await loginAdmin(payload);
      login(result);

      addToast({
        title: "Login Successful",
        description: "Welcome back! Redirecting to dashboard...",
        color: "success",
        radius: "full",
        timeout: 3000,
      });

      navigate("/dashboard", { replace: true });
    } catch (error) {
      addToast({
        title: "Login Failed",
        description: getLoginErrorMessage(error),
        color: "danger",
        radius: "full",
        timeout: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async () => {
    const emailError = validateEmail(email);

    if (emailError) {
      setErrors((prev) => ({ ...prev, email: emailError }));

      return;
    }

    setErrors((prev) => ({ ...prev, email: "" }));
    setIsSendingOtp(true);

    try {
      const response = await sendAdminLoginOtp(email.trim());

      setOtp("");
      setOtpSent(true);
      setOtpCooldown(30);

      addToast({
        title: "OTP Sent",
        description: response.message || "OTP sent successfully",
        color: "success",
        radius: "full",
        timeout: 3000,
      });
    } catch (error) {
      addToast({
        title: "Failed to Send OTP",
        description: getLoginErrorMessage(error),
        color: "danger",
        radius: "full",
        timeout: 3000,
      });
    } finally {
      setIsSendingOtp(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-default-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardBody className="gap-4 p-6">
          <div>
            <h1 className="text-2xl font-semibold">Admin Login</h1>
            <p className="text-sm text-default-500">Sign in to access the dashboard</p>
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-2">
              <Button
                color="primary"
                type="button"
                variant={mode === "password" ? "solid" : "flat"}
                onPress={() => switchMode("password")}
              >
                Login with Password
              </Button>
              <Button
                color="primary"
                type="button"
                variant={mode === "otp" ? "solid" : "flat"}
                onPress={() => switchMode("otp")}
              >
                Login with OTP
              </Button>
            </div>

            <Input
              isRequired
              label="Email"
              labelPlacement="outside"
              placeholder="admin@example.com"
              type="email"
              value={email}
              onValueChange={setEmail}
              isInvalid={Boolean(errors.email)}
              errorMessage={errors.email}
            />

            {mode === "password" ? (
              <Input
                isRequired
                label="Password"
                labelPlacement="outside"
                placeholder="Enter your password"
                type="password"
                value={password}
                onValueChange={setPassword}
                isInvalid={Boolean(errors.password)}
                errorMessage={errors.password}
              />
            ) : (
              <>
                <Button
                  className=""
                  isDisabled={isSendingOtp || otpCooldown > 0}
                  isLoading={isSendingOtp}
                  type="button"
                  variant="faded"
                  onPress={handleSendOtp}
                >
                  {otpCooldown > 0 ? `Resend OTP in ${otpCooldown}s` : otpSent ? "Resend OTP" : "Send OTP"}
                </Button>

                

                <InputOtp
                  isRequired
                  label="OTP"
                  length={6}
                  size="lg"
                  radius="lg"
                  allowedKeys={REGEXP_ONLY_DIGITS}
                  value={otp}
                  variant="faded"
                  onValueChange={setOtp}
                  isInvalid={Boolean(errors.otp)}
                  errorMessage={errors.otp}
                />
              </>
            )}

            <Button color="primary" isLoading={isLoading} type="submit" className="mt-2">
              {mode === "password" ? "Login" : "Login with OTP"}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}

export default Login;
