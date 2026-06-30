import React from 'react';
import { useForm } from 'react-hook-form';
import { useDemoAuth } from './DemoAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

interface LoginFormData {
  username: string;
  password: string;
}

export default function LoginPage() {
  const { login, isLoading } = useDemoAuth();
  const [error, setError] = React.useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    setError('');
    try {
      await login(data.username, data.password);
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#103B73]/5 via-background to-[#F2811D]/10 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-20 w-full max-w-xs items-center justify-center rounded-xl bg-white p-3 shadow-md border border-border/50">
            <img src="/img/logo.jpeg" alt="IDENNA" className="h-full w-full object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#103B73]">SIRP-NNA</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Sistema Integral de Registro y Protección de Niños, Niñas y Adolescentes
            </p>
            <p className="text-xs text-muted-foreground/80 mt-1">IDENNA · Venezuela</p>
          </div>
        </div>

        <Card className="border-t-4 border-t-[#F2811D] shadow-lg">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-lg text-[#103B73]">Iniciar sesión</CardTitle>
            <CardDescription>Ingresa tus credenciales para acceder al sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="username">Usuario o Correo electrónico</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="usuario o correo@ejemplo.com"
                  {...register('username', {
                    required: 'El usuario o correo es requerido',
                    validate: (value) => {
                      const isEmail = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value);
                      const isUsername = /^[a-zA-Z0-9_]{3,20}$/.test(value);
                      return isEmail || isUsername || 'Ingresa un correo válido o un nombre de usuario';
                    },
                  })}
                  disabled={isLoading}
                />
                {errors.username && (
                  <p className="text-sm text-red-600">{errors.username.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="********"
                  {...register('password', {
                    required: 'La contraseña es requerida',
                    minLength: {
                      value: 6,
                      message: 'La contraseña debe tener al menos 6 caracteres',
                    },
                  })}
                  disabled={isLoading}
                />
                {errors.password && (
                  <p className="text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-[#103B73] hover:bg-[#0d3260] text-white"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Iniciando sesión...
                  </>
                ) : (
                  'Iniciar Sesión'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
