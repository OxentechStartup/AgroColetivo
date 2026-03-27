/**
 * COMO USAR O CONTEXT CENTRALIZADO
 * 
 * O AppProvider gerencia TODOS os dados em tempo real para os 3 usuários:
 * - VENDOR (Fornecedor)
 * - GESTOR (Gerenciador de campanhas)
 * - BUYER (Comprador/Produtor)
 * 
 * ========================================================================
 * EXEMPLO 1: Acessar dados de autenticação e campanhas
 * ========================================================================
 * 
 * import { useAppData } from "../hooks/useAppData";
 * 
 * export function MeuComponente() {
 *   const { user, campaigns, isAuthenticated } = useAppData();
 *   
 *   if (!isAuthenticated) return <div>Faça login primeiro</div>;
 *   
 *   return (
 *     <div>
 *       <h1>Olá, {user.email}</h1>
 *       <p>Você tem {campaigns.length} campanhas</p>
 *     </div>
 *   );
 * }
 * 
 * ========================================================================
 * EXEMPLO 2: Agir em campanhas (criar, atualizar, deletar)
 * ========================================================================
 * 
 * import { useAppData } from "../hooks/useAppData";
 * 
 * export function CriarCampanha() {
 *   const { addCampaign, addNotification } = useAppData();
 *   
 *   const handleCreate = async () => {
 *     try {
 *       await addCampaign({ name: "Nova Campanha", ... });
 *       addNotification({
 *         type: "success",
 *         message: "Campanha criada com sucesso!"
 *       });
 *     } catch (error) {
 *       addNotification({
 *         type: "error",
 *         message: "Erro ao criar campanha"
 *       });
 *     }
 *   };
 *   
 *   return <button onClick={handleCreate}>Criar</button>;
 * }
 * 
 * ========================================================================
 * EXEMPLO 3: Status em tempo real para VENDOR
 * ========================================================================
 * 
 * import { useAppData } from "../hooks/useAppData";
 * import { isVendor } from "../constants/roles";
 * 
 * export function PropostasVendedor() {
 *   const { user, campaigns, realTimeActive } = useAppData();
 *   
 *   if (!isVendor(user?.role)) return null;
 *   
 *   const minhasPropostas = campaigns.filter(c => 
 *     c.offers?.some(o => o.vendor_id === user.id)
 *   );
 *   
 *   return (
 *     <div>
 *       <div>
 *         {realTimeActive && <span className="status-online">🟢 Online</span>}
 *       </div>
 *       <h2>Minhas Propostas ({minhasPropostas.length})</h2>
 *       {minhasPropostas.map(c => (
 *         <div key={c.id}>{c.name}</div>
 *       ))}
 *     </div>
 *   );
 * }
 * 
 * ========================================================================
 * EXEMPLO 4: Status em tempo real para GESTOR
 * ========================================================================
 * 
 * import { useAppData } from "../hooks/useAppData";
 * import { isGestor } from "../constants/roles";
 * 
 * export function DashboardGestor() {
 *   const { user, campaigns, vendors, realTimeActive } = useAppData();
 *   
 *   if (!isGestor(user?.role)) return null;
 *   
 *   return (
 *     <div>
 *       <div>
 *         Status em tempo real: {realTimeActive ? "🟢 Ativo" : "🔴 Inativo"}
 *       </div>
 *       <h2>Campanhas ({campaigns.length})</h2>
 *       <h2>Fornecedores ({vendors.length})</h2>
 *       {}
 *     </div>
 *   );
 * }
 * 
 * ========================================================================
 * EXEMPLO 5: Notificações (auto-dismiss após 5 segundos)
 * ========================================================================
 * 
 * import { useAppData } from "../hooks/useAppData";
 * 
 * export function MinhaNotificacao() {
 *   const { notifications } = useAppData();
 *   
 *   return (
 *     <div className="notifications">
 *       {notifications.map(notif => (
 *         <div key={notif.id} className={`notif-${notif.type}`}>
 *           {notif.message}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * 
 * ========================================================================
 * DADOS DISPONÍVEIS NO CONTEXT
 * ========================================================================
 * 
 * AUTENTICAÇÃO:
 *   - user (objeto usuário)
 *   - isAuthenticated (boolean)
 *   - profile (perfil completo)
 *   - authLoading (boolean)
 *   - loadingProfile (boolean)
 *   - login(email, password)
 *   - register(email, password, role, metadata)
 *   - logout()
 * 
 * CAMPANHAS:
 *   - campaigns (array)
 *   - vendors (array)
 *   - ownVendor (objeto ou null)
 *   - campaignsLoading (boolean)
 *   - campaignsError (string ou null)
 *   - addCampaign(data)
 *   - updateCampaign(id, data)
 *   - deleteCampaign(id)
 *   - reloadCampaign(id)
 *   - addVendor(data)
 *   - deleteVendor(id)
 * 
 * PEDIDOS:
 *   - addOrder(campaignId, data)
 *   - updateOrder(id, data)
 *   - deleteOrder(id)
 *   - publishToVendors(campaignId)
 *   - addPendingOrder(data)
 *   - updateCampaignFinancials(id, data)
 * 
 * NOTIFICAÇÕES:
 *   - notifications (array)
 *   - addNotification(notification)
 * 
 * TEMPO REAL:
 *   - realTimeActive (boolean)
 * 
 * ========================================================================
 * NOTAS IMPORTANTES
 * ========================================================================
 * 
 * ✅ Todos os dados são compartilhados entre componentes
 * ✅ Atualizações em tempo real via Supabase RealtimeSubscriptions
 * ✅ Auto-limpa subscrições ao desmontar
 * ✅ Funciona para os 3 tipos de usuários
 * ✅ Notificações com auto-dismiss após 5 segundos
 * 
 * ❌ NEVER usar useAppData() fora de um componente envolvido por AppProvider
 * ❌ NEVER chamar useAppData() em condicionais ou loops
 * ❌ Se receber erro "deve ser usado dentro de <AppProvider>", 
 *     verifique se App.jsx está envolvido com AppProvider
 */

export const CONTEXT_USAGE_GUIDE = {};
