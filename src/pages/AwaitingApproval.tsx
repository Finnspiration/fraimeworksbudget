import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import logo from '@/assets/logo.png';
import { Navigate } from 'react-router-dom';

export default function AwaitingApproval() {
  const { profile, signOut, session } = useAuth();

  if (!session) return <Navigate to="/login" replace />;
  if (profile?.approved) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <img src={logo} alt="FraimeWorks" className="h-10 mx-auto mb-2" />
          <CardTitle className="flex items-center justify-center gap-2">
            <Clock className="h-5 w-5" /> Afventer godkendelse
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Din konto er oprettet, men en administrator skal godkende din adgang.
          </p>
          <Button variant="outline" onClick={signOut}>Log ud</Button>
        </CardContent>
      </Card>
    </div>
  );
}
