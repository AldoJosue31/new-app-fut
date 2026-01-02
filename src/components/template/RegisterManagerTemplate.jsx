import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabase.config";
import { v } from "../../styles/variables";
import { 
  Card, Btnsave, InputText2, Title, ToggleTema, Modal, Toast 
} from "../../index";
import { BiErrorCircle, BiCheckCircle, BiTrophy, BiFootball } from "react-icons/bi";

export function RegisterManagerTemplate({ token }) {
  const navigate = useNavigate();
  const [invitationData, setInvitationData] = useState(null);
  const [isValidating, setIsValidating] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [form, setForm] = useState({ fullName: "", email: "", password: "", leagueName: "" });
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Estado para el Modal de Éxito
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [countdown, setCountdown] = useState(3);

  // Estado para el Toast de Error
  const [toast, setToast] = useState({ show: false, message: "", type: "error" });

  // Validación inicial del token
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

  // Lógica del Contador y Redirección de Éxito
  useEffect(() => {
    let timer;
    if (showSuccessModal && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (showSuccessModal && countdown === 0) {
      handleRedirectLogin();
    }
    return () => clearTimeout(timer);
  }, [showSuccessModal, countdown]);

  const handleRedirectLogin = async () => {
      await supabase.auth.signOut();
      navigate("/login");
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsRegistering(true);
    
    const finalLeagueName = invitationData.league_name || form.leagueName;
    if(!finalLeagueName) {
        // Usamos Toast para validaciones también
        setToast({ show: true, message: "Por favor asigna un nombre a tu liga.", type: "error" });
        setIsRegistering(false);
        return;
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { 
            data: { full_name: form.fullName },
            emailRedirectTo: window.location.origin 
        }
      });

      if (authError) throw authError;
      if (!authData.user) {
         throw new Error("El registro se inició, pero no se devolvió usuario.");
      }

      if (authData.user) {
        const { data: rpcData, error: rpcError } = await supabase.rpc("procesar_invitacion_manager", {
            p_token: token,
            p_user_id: authData.user.id,
            p_league_name: finalLeagueName
        });

        if (rpcError) throw rpcError;
        if (!rpcData.success) throw new Error(rpcData.message);

        // --- ÉXITO ---
        setShowSuccessModal(true);
        
      } else {
         // Caso raro donde signUp requiere confirmación por email manual antes de continuar
         setToast({ show: true, message: "Revisa tu correo para confirmar la cuenta.", type: "success" });
      }
    } catch (err) {
      // --- MANEJO DE ERRORES CON TOAST ---
      let message = err.message;
      
      // Traducción del error común de Supabase
      if (message === "User already registered" || message.includes("User already registered")) {
        message = "Este correo electrónico ya está registrado. Por favor inicia sesión.";
      }
      
      setToast({ show: true, message: message, type: "error" });
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
      {/* --- TOAST PARA ERRORES --- */}
      <Toast 
        show={toast.show} 
        message={toast.message} 
        type={toast.type} 
        onClose={() => setToast({ ...toast, show: false })} 
      />

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
              <InputText2>
                <input 
                  className="form__field" 
                  required 
                  placeholder=" " 
                  value={form.leagueName} 
                  onChange={e => setForm({...form, leagueName: e.target.value})} 
                />
                <label className="form__label">Nombre de tu Liga</label>
                <BiFootball className="icon-input"/>
              </InputText2>
           )}

           <InputText2>
             <input 
                className="form__field" 
                required 
                placeholder=" " 
                value={form.fullName} 
                onChange={e => setForm({...form, fullName: e.target.value})} 
             />
             <label className="form__label">Nombre Completo</label>
           </InputText2>

           <InputText2>
             <input 
                type="email"
                className="form__field" 
                required 
                placeholder=" " 
                value={form.email} 
                onChange={e => setForm({...form, email: e.target.value})} 
             />
             <label className="form__label">Correo Electrónico</label>
           </InputText2>

           <InputText2>
             <input 
                type="password"
                className="form__field" 
                required 
                placeholder=" " 
                value={form.password} 
                onChange={e => setForm({...form, password: e.target.value})} 
                minLength={6}
             />
             <label className="form__label">Contraseña</label>
           </InputText2>
           
           <ActionArea>
             <Btnsave titulo={isRegistering ? "Creando..." : "Registrar"} bgcolor={v.colorPrincipal} icono={<BiCheckCircle/>} width="100%" disabled={isRegistering} />
           </ActionArea>
        </Form>
      </Card>

      {/* --- MODAL DE ÉXITO --- */}
      <Modal 
        isOpen={showSuccessModal} 
        onClose={null} 
        closeOnOverlayClick={false} 
        title="¡Bienvenido!"
      >
        <SuccessContent>
            <div className="icon-success"><BiCheckCircle /></div>
            <h3>Cuenta Creada Exitosamente</h3>
            <p>Tu cuenta y tu liga han sido configuradas.</p>
            
            <div className="countdown-container">
               <span className="text">Redirigiendo al login en</span>
               <span className="number">{countdown}</span>
               <span className="text">segundos...</span>
            </div>
        </SuccessContent>
      </Modal>

    </FullScreenContainer>
  );
}

// --- ESTILOS ---
const FullScreenContainer = styled.div` 
  position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; 
  background: ${({theme}) => theme.bgtotal}; 
  z-index: 9999; 
  display: flex; justify-content: center; align-items: center; 
  padding: 20px; overflow-y: auto; 
`;
const ThemeButtonWrapper = styled.div` 
  position: absolute; top: 20px; right: 20px; z-index: 10000; 
`;
const Header = styled.div` text-align: center; margin-bottom: 20px; .sub { opacity: 0.6; font-size: 0.9rem; }`;
const InvitationInfo = styled.div` background: ${v.colorPrincipal}15; color: ${({theme})=>theme.text}; padding: 12px; border-radius: 8px; border: 1px dashed ${v.colorPrincipal}; margin-bottom: 20px; display: flex; align-items: center; gap: 8px; font-size: 0.9rem; `;
const Form = styled.form` display: flex; flex-direction: column; gap: 10px; `; 
const ActionArea = styled.div` margin-top: 10px; `;

const SuccessContent = styled.div`
    display: flex; flex-direction: column; align-items: center; text-align: center; gap: 20px; padding: 20px 10px;
    
    .icon-success { 
        font-size: 5rem; 
        color: ${v.verde}; 
        animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    
    h3 { margin: 0; color: ${({theme})=>theme.text}; font-size: 1.4rem;}
    p { margin: 0; opacity: 0.8; color: ${({theme})=>theme.text}; font-size: 1rem; }

    .countdown-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        background: ${({theme})=>theme.bgtotal};
        padding: 15px 30px;
        border-radius: 12px;
        border: 1px solid ${({theme})=>theme.bg4};
        
        .text { font-size: 0.9rem; opacity: 0.7; }
        .number { 
            font-size: 2.5rem; 
            font-weight: 800; 
            color: ${v.colorPrincipal};
            line-height: 1;
            margin: 5px 0;
        }
    }

    @keyframes popIn {
        from { transform: scale(0); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
    }
`;