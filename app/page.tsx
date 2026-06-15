import { BeaconStoreProvider } from "@/lib/store"
import { DefaultLightTheme } from "@/components/default-light-theme"
import { AppShell } from "@/components/app-shell"

export default function Page() {
  return (
    <BeaconStoreProvider>
      <DefaultLightTheme />
      <AppShell />
    </BeaconStoreProvider>
  )
}
