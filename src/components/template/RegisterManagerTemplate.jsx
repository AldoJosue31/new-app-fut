import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabase.config";
import { v } from "../../styles/variables";
import { 
  Card, Btnsave, InputText2, Title, ToggleTema 
} from "../../index";
import { BiErrorCircle, BiCheckCircle, BiTrophy, BiFootball } from "react-icons/bi";

export function RegisterManagerTemplate({ token }) {
  const navigate = useNavigate();
  const [invitationData, setInvitationData] = useState(null);
  const [isValidating, setIsValidating] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [form, setForm] = useState({ fullName: "", email: "", password: "", leagueName: "" });
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    const validate = async () => {
      try {
        const { data, error } = await supabase
          .from("manager_invitations")
          .select("*")
          .eq("token", token)
          .maybeSingle();

        if (error) throw error;
        if (!data) throw new Error("Invitación no encontrada.");
        if (data.is_used) throw new Error("Esta invitación ya fue utilizada o revocada.");
        
        setInvitationData(data);
      } catch (err) {
        setErrorMsg(err.message);
      } finally {
        setIsValidating(false);
      }
    };
    if(token) validate();
  }, [token]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsRegistering(true);
    
    const finalLeagueName = invitationData.league_name || form.leagueName;
    if(!finalLeagueName) {
        alert("Por favor asigna un nombre a tu liga.");
        setIsRegistering(false);
        return;
    }

    try {
const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { 
            data: { full_name: form.fullName },
            // IMPORTANTE: Esto evita que pida confirmación si la config del proyecto lo permite
            emailRedirectTo: window.location.origin 
        }
      });

if (authError) throw authError;
if (!authData.user) {
         throw new Error("El registro se inició, pero el usuario no fue devuelto. Revisa si tienes activada la confirmación de correo.");
      }

      if (authData.user) {
        const { data: rpcData, error: rpcError } = await supabase.rpc("procesar_invitacion_manager", {
            p_token: token,
            p_user_id: authData.user.id,
            p_league_name: finalLeagueName
        });

        if (rpcError) throw rpcError;
        if (!rpcData.success) throw new Error(rpcData.message);

        alert("¡Cuenta creada exitosamente! Bienvenido.");
        window.location.href = "/login";
      } else {
         alert("Revisa tu correo para confirmar la cuenta.");
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsRegistering(false);
    }
  };

  if (isValidating) return <FullScreenContainer><p>Validando invitación...</p></FullScreenContainer>;
  
  if (errorMsg) return (
    <FullScreenContainer>
      <Card maxWidth="400px">
         <div style={{textAlign:'center', padding: 20}}>
            <BiErrorCircle size={50} color={v.rojo} />
            <h3 style={{color:v.rojo}}>Enlace Inválido</h3>
            <p>{errorMsg}</p>
            <Btnsave titulo="Ir al Inicio" funcion={() => navigate("/")} bgcolor={v.rojo} />
         </div>
      </Card>
    </FullScreenContainer>
  );

  return (
    <FullScreenContainer>
      <ThemeButtonWrapper><ToggleTema /></ThemeButtonWrapper>
      <Card maxWidth="500px">
        <Header>
           <Title>Registro de Manager</Title>
           <p className="sub">Configura tu cuenta para comenzar</p>
        </Header>

        <Form onSubmit={handleRegister}>
           {invitationData.league_name ? (
              <InvitationInfo><BiTrophy /> Invitado a: <b>{invitationData.league_name}</b></InvitationInfo>
           ) : (
              <InputGroup>
                <label>Nombre de tu Liga *</label>
                <InputText2>
                  <input required value={form.leagueName} onChange={e => setForm({...form, leagueName: e.target.value})} placeholder="Ej: Liga Sabatina 2025" />
                  <BiFootball className="icon-input"/>
                </InputText2>
              </InputGroup>
           )}

           <InputGroup>
             <label>Nombre Completo</label>
             <InputText2><input required value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} placeholder="Tu nombre" /></InputText2>
           </InputGroup>

           <InputGroup>
             <label>Correo Electrónico</label>
             <InputText2><input type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="tucorreo@ejemplo.com" /></InputText2>
           </InputGroup>

           <InputGroup>
             <label>Contraseña</label>
             <InputText2><input type="password" required value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="******" minLength={6} /></InputText2>
           </InputGroup>
           
           <ActionArea>
             <Btnsave titulo={isRegistering ? "Creando..." : "Registrar"} bgcolor={v.colorPrincipal} icono={<BiCheckCircle/>} width="100%" disabled={isRegistering} />
           </ActionArea>
        </Form>
      </Card>
    </FullScreenContainer>
  );
}

// --- ESTILOS QUE FALTABAN ---
const FullScreenContainer = styled.div` 
  position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; 
  background: ${({theme}) => theme.bgtotal}; z-index: 9999; 
  display: flex; justify-content: center; align-items: center; 
  padding: 20px; overflow-y: auto; 
`;
const ThemeButtonWrapper = styled.div` 
  position: absolute; top: 20px; right: 20px; z-index: 10000; 
`;
const Header = styled.div` text-align: center; margin-bottom: 20px; .sub { opacity: 0.6; font-size: 0.9rem; }`;
const InvitationInfo = styled.div` background: ${v.colorPrincipal}15; color: ${({theme})=>theme.text}; padding: 12px; border-radius: 8px; border: 1px dashed ${v.colorPrincipal}; margin-bottom: 15px; display: flex; align-items: center; gap: 8px; font-size: 0.9rem; `;
const Form = styled.form` display: flex; flex-direction: column; gap: 15px; `;
const InputGroup = styled.div` display: flex; flex-direction: column; gap: 5px; label { font-size: 0.85rem; font-weight: 600; color: ${({theme})=>theme.text}; opacity: 0.8; } .icon-input { position: absolute; right: 10px; top: 12px; opacity: 0.5; } `;
const ActionArea = styled.div` margin-top: 10px; `;