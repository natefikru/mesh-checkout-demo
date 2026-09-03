import { callMesh } from '@/lib/mesh/client'
import type { GetMeshTransfersResponseContent, TransferModel } from '@/lib/mesh/types'

/**
 * Mesh's own record of the transfer behind an order, looked up by the order
 * id we pass as transferOptions.transactionId when minting the payment link
 * token, which comes back as clientTransactionId here. Paired against this
 * app's own order state in the UI: one is what we recorded, this is what
 * Mesh's API says actually happened. DescendingOrder makes "most recent"
 * explicit rather than relying on undocumented default ordering.
 */
export async function getMeshTransferByClientId(clientTransactionId: string, sessionId?: string): Promise<TransferModel | null> {
  const query = new URLSearchParams({
    ClientTransactionId: clientTransactionId,
    Count: '1',
    DescendingOrder: 'true',
  })

  const content = await callMesh<GetMeshTransfersResponseContent>(
    'GET',
    `/api/v1/transfers/managed/mesh?${query.toString()}`,
    { sessionId },
  )

  return content.items[0] ?? null
}
