import { toastController } from "@ionic/vue";

export async function showToast(
  message: string,
  duration = 2500,
): Promise<void> {
  const toast = await toastController.create({
    message,
    duration,
    position: "bottom",
  });
  await toast.present();
}
