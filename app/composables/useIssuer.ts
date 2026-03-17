import type { KeyPairInfo, GenerateResult } from "#shared/types";

export function useIssuer() {
  const form = reactive({
    file: null as File | null,
    fileName: "",
    fileSize: 0,
    validFrom: "",
    validUntil: "",
    selectedKeyId: "",
    metadata: "",
    issuerID: "",
    qrPosition: "bottom-right",
    qrPage: 0,
    qrSize: 30,
  });

  const isGenerating = ref(false);
  const result = ref<GenerateResult | null>(null);
  const error = ref("");
  const keys = ref<KeyPairInfo[]>([]);

  const isPDF = computed(() => form.fileName.toLowerCase().endsWith(".pdf"));

  function formatDatetimeLocal(d: Date): string {
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function setTimePreset(preset: string) {
    const now = new Date();
    form.validFrom = formatDatetimeLocal(now);
    const end = new Date(now);
    switch (preset) {
      case "hour":
        end.setHours(end.getHours() + 1);
        break;
      case "day":
        end.setDate(end.getDate() + 1);
        break;
      case "week":
        end.setDate(end.getDate() + 7);
        break;
      case "month":
        end.setMonth(end.getMonth() + 1);
        break;
    }
    form.validUntil = formatDatetimeLocal(end);
  }

  function setFile(f: File) {
    form.file = f;
    form.fileName = f.name;
    form.fileSize = f.size;
    error.value = "";
  }

  async function loadKeys() {
    try {
      const res = await $fetch<{ success: boolean; data: KeyPairInfo[] }>(
        "/api/keys",
      );
      keys.value = res.data;
      const defaultKey = res.data.find(
        (k) => k.is_default && k.has_private_key,
      );
      if (defaultKey && !form.selectedKeyId) {
        form.selectedKeyId = defaultKey.id;
      }
    } catch (e: any) {
      console.error("Failed to load keys:", e);
    }
  }

  async function generateQR() {
    if (
      !form.file ||
      !form.selectedKeyId ||
      !form.validFrom ||
      !form.validUntil
    ) {
      error.value = "Please fill in all required fields";
      return;
    }

    isGenerating.value = true;
    error.value = "";

    try {
      const formData = new FormData();
      formData.append("file", form.file);
      formData.append("key_pair_id", form.selectedKeyId);
      formData.append("valid_from", new Date(form.validFrom).toISOString());
      formData.append("valid_until", new Date(form.validUntil).toISOString());
      formData.append("issuer_id", form.issuerID);
      formData.append("metadata", form.metadata);
      formData.append("qr_position", form.qrPosition);
      formData.append("qr_page", form.qrPage.toString());
      formData.append("qr_size", form.qrSize.toString());

      const res = await $fetch<{ success: boolean; data: GenerateResult }>(
        "/api/issuer/generate",
        {
          method: "POST",
          body: formData,
        },
      );

      result.value = res.data;
    } catch (e: any) {
      error.value =
        e.data?.message ||
        e.statusMessage ||
        e.message ||
        "Failed to create QR code";
    } finally {
      isGenerating.value = false;
    }
  }

  function saveQR() {
    if (!result.value?.qr_code_base64) return;
    const link = document.createElement("a");
    link.href = result.value.qr_code_base64;
    link.download = `qr-${result.value.secure_id}.png`;
    link.click();
  }

  function savePDF() {
    if (!result.value?.signed_pdf_base64) return;
    const bytes = Uint8Array.from(atob(result.value.signed_pdf_base64), (c) =>
      c.charCodeAt(0),
    );
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `signed-${result.value.file_name}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function reset() {
    form.file = null;
    form.fileName = "";
    form.fileSize = 0;
    result.value = null;
    error.value = "";
  }

  // Initialize with day preset
  setTimePreset("day");

  return {
    ...form,
    isGenerating,
    result,
    error,
    keys,
    isPDF,
    setFile,
    setTimePreset,
    loadKeys,
    generateQR,
    saveQR,
    savePDF,
    reset,
  };
}
