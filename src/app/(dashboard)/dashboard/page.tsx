import { loadQboStoreFromDb } from "@/lib/qbo-db";
import { QboWorkspace } from "@/components/qbo/qbo-workspace";

export default async function DashboardPage() {
  const { state: initialState } = await loadQboStoreFromDb();
  return <QboWorkspace initialState={initialState} />;
}
