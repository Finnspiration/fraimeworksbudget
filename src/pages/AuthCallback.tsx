import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Check if user is approved before redirecting
        supabase
          .from('profiles')
          .select('approved')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            if (data?.approved) {
              navigate('/', { replace: true });
            } else {
              navigate('/awaiting-approval', { replace: true });
            }
          });
      }
    });

    // Also check if session is already established (e.g. hash was parsed before effect ran)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        supabase
          .from('profiles')
          .select('approved')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            if (data?.approved) {
              navigate('/', { replace: true });
            } else {
              navigate('/awaiting-approval', { replace: true });
            }
          });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
