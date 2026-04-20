import { createClient } from '@supabase/supabase-js'

export const STORAGE_BUCKET = 'final-reviews'

/** Cliente Supabase com service role — apenas para uso server-side */
function getStorageClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

/**
 * Faz upload de um arquivo para o Supabase Storage.
 * @param buffer      Conteúdo do arquivo em Buffer
 * @param path        Caminho dentro do bucket (ex: "abc123/0_0_1700000.jpg")
 * @param contentType MIME type do arquivo
 * @returns URL pública e permanente do arquivo
 */
export async function uploadFile(
  buffer: Buffer,
  path: string,
  contentType: string
): Promise<string> {
  const supabase = getStorageClient()

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, buffer, { contentType, upsert: true })

  if (error) throw new Error(`Erro no upload: ${error.message}`)

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/**
 * Remove todos os arquivos de uma pasta do Storage.
 * Chamado automaticamente ao excluir uma aprovação final.
 * @param folder Nome da pasta (o storage_folder da review, ex: "abc123def456...")
 */
export async function deleteStorageFolder(folder: string): Promise<void> {
  if (!folder) return

  const supabase = getStorageClient()

  // Lista arquivos na pasta (sem sub-pastas, estrutura plana)
  const { data: files, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .list(folder, { limit: 1000 })

  if (error || !files?.length) return

  // Filtra apenas arquivos reais (id null = entrada de pasta virtual)
  const filePaths = files
    .filter((f) => f.id !== null)
    .map((f) => `${folder}/${f.name}`)

  if (filePaths.length === 0) return

  const { error: deleteError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove(filePaths)

  if (deleteError) {
    console.error(`Erro ao remover arquivos do Storage (${folder}):`, deleteError.message)
  }
}
