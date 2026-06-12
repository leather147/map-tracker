import { BeaconStoreProvider } from "@/lib/store"
import { AppShell } from "@/components/app-shell"

export default function Page() {
  return (
    <BeaconStoreProvider>
      <AppShell />
    </BeaconStoreProvider>
  )
}
