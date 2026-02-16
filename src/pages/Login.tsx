import { Button, Card, CardBody, Input, addToast } from "@heroui/react";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { getLoginErrorMessage, loginAdmin } from "@/api/auth.api";
import { useAuth } from "@/context/AuthContext";

interface LoginFormErrors {
  email: string;
  password: string;
}

const initialErrors: LoginFormErrors = {
  email: "",
  password: "",
};

function Login() {
  const navigate = useNavigate();
  const { login, token } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<LoginFormErrors>(initialErrors);
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (token) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate, token]);

  const validate = (): boolean => {
    const nextErrors: LoginFormErrors = { ...initialErrors };

    if (!email.trim()) {
      nextErrors.email = "Email is required";
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      nextErrors.email = "Enter a valid email";
    }

    if (!password) {
      nextErrors.password = "Password is required";
    } else if (password.length < 6) {
      nextErrors.password = "Password must be at least 6 characters";
    }

    setErrors(nextErrors);
    return !nextErrors.email && !nextErrors.password;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validate()) return;

    setIsLoading(true);

    try {
      const result = await loginAdmin({ email, password });
      login(result);

      // ✅ SUCCESS TOAST
      addToast({
        title: "Login Successful",
        description: "Welcome back! Redirecting to dashboard...",
        color: "success",
        radius: "full",
        timeout: 3000,
      });

      navigate("/dashboard", { replace: true });
    } catch (error) {
      // ❌ ERROR TOAST
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-default-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardBody className="gap-4 p-6">
          <div>
            <h1 className="text-2xl font-semibold">Admin Login</h1>
            <p className="text-sm text-default-500">
              Sign in to access the dashboard
            </p>
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
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

            <Button
              color="primary"
              isLoading={isLoading}
              type="submit"
              className="mt-2"
            >
              Login
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}

export default Login;
