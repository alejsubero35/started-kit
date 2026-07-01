import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { KeyRound, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';

import { useDemoAuth } from '@/features/auth/DemoAuthContext';
import { idennaAuthService } from '@/services/idenna.auth.service';
import { roleLabel } from '@/services/users.service';
import { CustomButton } from '@/components/ui/custom-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

export default function ProfilePage() {
  const { user } = useDemoAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: freshUser } = useQuery({
    queryKey: ['me'],
    queryFn: () => idennaAuthService.getCurrentUser(),
  });

  const profile = freshUser ?? user;
  const roles = Array.isArray(profile?.roles) ? profile.roles : [];
  const isSuperAdmin = roles.includes('super-admin');

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== passwordConfirmation) {
      toast.error('La confirmación de contraseña no coincide');
      return;
    }
    if (password.length < 8) {
      toast.error('La nueva contraseña debe tener al menos 8 caracteres');
      return;
    }

    setSubmitting(true);
    try {
      await idennaAuthService.changePassword({
        ...(isSuperAdmin ? {} : { current_password: currentPassword }),
        password,
        password_confirmation: passwordConfirmation,
      });
      setCurrentPassword('');
      setPassword('');
      setPasswordConfirmation('');
      toast.success('Contraseña actualizada correctamente');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cambiar la contraseña');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#103B73] flex items-center gap-2">
          <UserIcon className="h-7 w-7" />
          Mi perfil
        </h1>
        <p className="text-muted-foreground">Datos de su cuenta y seguridad</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información de la cuenta</CardTitle>
          <CardDescription>Datos asociados a su sesión actual</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between gap-4 border-b pb-3">
            <span className="text-muted-foreground">Nombre</span>
            <span className="font-medium text-right">{profile?.name ?? '—'}</span>
          </div>
          <div className="flex justify-between gap-4 border-b pb-3">
            <span className="text-muted-foreground">Correo</span>
            <span className="font-medium text-right break-all">{profile?.email ?? '—'}</span>
          </div>
          <div className="flex justify-between gap-4 border-b pb-3">
            <span className="text-muted-foreground">Rol</span>
            <span className="font-medium text-right">
              {roles.length > 0 ? (
                <Badge variant="secondary">{roleLabel(String(roles[0]))}</Badge>
              ) : (
                '—'
              )}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Operativo</span>
            <span className="font-medium text-right">{profile?.current_operativo?.name ?? '—'}</span>
          </div>
        </CardContent>
      </Card>

      <Card id="password">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-[#103B73]" />
            Cambiar contraseña
          </CardTitle>
          <CardDescription>
            {isSuperAdmin
              ? 'Como super administrador puede establecer una nueva contraseña sin la actual'
              : 'Use una contraseña segura de al menos 8 caracteres'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleChangePassword(e)} className="space-y-4">
            {!isSuperAdmin && (
              <div>
                <Label htmlFor="current_password">Contraseña actual *</Label>
                <Input
                  id="current_password"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
            )}
            <div>
              <Label htmlFor="password">Nueva contraseña *</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div>
              <Label htmlFor="password_confirmation">Confirmar nueva contraseña *</Label>
              <Input
                id="password_confirmation"
                type="password"
                autoComplete="new-password"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <CustomButton type="submit" loading={submitting} className="w-full sm:w-auto">
              Actualizar contraseña
            </CustomButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
