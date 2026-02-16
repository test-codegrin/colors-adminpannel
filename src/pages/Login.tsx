import { Button, Card, CardBody, Input } from "@heroui/react";
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
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [errors, setErrors] = useState<LoginFormErrors>(initialErrors);
  const [formError, setFormError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

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

    if (!validate()) {
      return;
    }

    setIsLoading(true);
    setFormError("");

    try {
      const result = await loginAdmin({ email, password });
      login(result);
      navigate("/dashboard", { replace: true });
    } catch (requestError) {
      setFormError(getLoginErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-default-50 p-4">
      <Card className="w-full max-w-md">
        <CardBody className="gap-4 p-6">
          <div>
            <h1 className="text-2xl font-semibold">Admin Login</h1>
            <p className="text-sm text-default-500">Sign in to access the dashboard.</p>
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <Input
              isRequired
              errorMessage={errors.email}
              isInvalid={Boolean(errors.email)}
              label="Email"
              labelPlacement="outside"
              placeholder="admin@example.com"
              type="email"
              value={email}
              onValueChange={setEmail}
            />
            <Input
              isRequired
              errorMessage={errors.password}
              isInvalid={Boolean(errors.password)}
              label="Password"
              labelPlacement="outside"
              placeholder="Enter your password"
              type="password"
              value={password}
              onValueChange={setPassword}
            />

            {formError ? <p className="text-sm text-danger">{formError}</p> : null}

            <Button color="primary" isLoading={isLoading} type="submit">
              Login
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}

export default Login;
