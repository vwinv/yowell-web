export function useSidebar() {
  const sidebarOpen = useState("sidebar-open", () => false);

  function openSidebar() {
    sidebarOpen.value = true;
  }

  function closeSidebar() {
    sidebarOpen.value = false;
  }

  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value;
  }

  watch(sidebarOpen, (open) => {
    if (!import.meta.client) return;
    document.body.style.overflow = open ? "hidden" : "";
  });

  onBeforeUnmount(() => {
    if (!import.meta.client) return;
    document.body.style.overflow = "";
  });

  return {
    sidebarOpen,
    openSidebar,
    closeSidebar,
    toggleSidebar,
  };
}
