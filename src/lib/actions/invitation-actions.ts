"use server";

export async function acceptInvitation(
  token: string,
): Promise<{ success: true } | { success: false; error: string }> {
  return { success: false, error: `DEBUG: action reached, token=${token?.slice(0, 8)}` };
}
