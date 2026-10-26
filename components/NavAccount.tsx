import NavAccountView from '@/components/NavAccountView';
import { currentUser } from '@/lib/session';

export default async function NavAccount() {
  const user = await currentUser();
  return <NavAccountView user={user} />;
}
