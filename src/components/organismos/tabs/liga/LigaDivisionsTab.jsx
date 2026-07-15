import React, { useState, useRef } from "react";
import styled from "styled-components";
import { v } from "../../../../styles/variables";
import { 
  RiBuilding2Line, 
  RiAddLine, 
  RiPencilLine, 
  RiDeleteBinLine, 
  RiFolder3Line,
  RiDraggable,
  RiSettings3Line
} from "react-icons/ri";
import { Card } from "../../../moleculas/Card";
import { CardHeader } from "../../../moleculas/CardHeader";
import { BtnGreen } from "../../../moleculas/BtnGreen";
import { Modal } from "../../Modal";
import { InputText2 } from "../../formularios/InputText2";
import { Btnsave } from "../../../moleculas/Btnsave";
import { ConfirmModal } from "../../ConfirmModal";
import { Skeleton } from "../../../atomos/Skeleton";
import { useDivisionStore } from "../../../../store/DivisionStore";

// Opciones predefinidas para facilitar la creación de categorías
const PRESET_CATEGORIES = ["Varonil", "Femenil", "Infantil", "Veteranos", "Libre"];

export function LigaDivisionsTab({ 
  onAddCategory, 
  onEditCategory,
  onDeleteCategory,
  onAddDivision, 
  onEditDivision, 
  onDeleteDivision, 
  loading 
}) {
  const { categorias, divisiones, fetchDivisiones, updateDivisionTiers } = useDivisionStore();

  const [modal, setModal] = useState({ open: false, type: '', data: null, targetCategory: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, type: '', id: null, name: '' });
  const [moveModal, setMoveModal] = useState({ open: false, source: null, targetCategoryId: null, targetCategoryName: '' });

  const [formValue, setFormValue] = useState("");
  const [categoryName, setCategoryName] = useState("");

  const handleSuccessAction = async (actionFunction, ...args) => {
     const success = await actionFunction(...args);
     if(success) {
         await fetchDivisiones();
         setModal({ ...modal, open: false });
     }
  };

  const handleOpen = (type, data = null, targetCategoryObj = null) => {
    setModal({ open: true, type, data, targetCategory: targetCategoryObj });
    setCategoryName(type === 'addCategory' ? "" : (data?.name || targetCategoryObj?.name || ""));
    setFormValue(type === 'editDivision' ? data?.name : "");
  };

  const handleSubmit = () => {
    if (modal.type === 'addCategory') {
        if (!categoryName.trim()) return alert("El nombre es requerido");
        handleSuccessAction(onAddCategory, categoryName.trim());
        return;
    }
    
    if (modal.type === 'editCategory') {
        if (!categoryName.trim()) return alert("El nombre es requerido");
        handleSuccessAction(onEditCategory, modal.data.id, categoryName.trim());
        return;
    }

    if (modal.type === 'addDivision') {
        if (!formValue.trim() || !modal.targetCategory) return alert("Faltan datos");
        const divEnEstaCat = divisiones.filter(d => d.category_id === modal.targetCategory.id);
        
        handleSuccessAction(onAddDivision, { 
            name: formValue.trim(), 
            category_id: modal.targetCategory.id, 
            tier: divEnEstaCat.length + 1 
        });
        return;
    }

    if (modal.type === 'editDivision') {
        if (!formValue.trim()) return alert("El nombre es requerido");
        handleSuccessAction(onEditDivision, modal.data.id, { 
            name: formValue.trim(), 
            category_id: modal.data.category_id 
        });
    }
  };

  // --- AUTO-AJUSTE ANTI-FALLAS PARA BORRADOS ---
  const confirmDelete = async () => {
    if(deleteModal.type === 'category') {
        const success = await onDeleteCategory(deleteModal.id);
        if(success) await fetchDivisiones();
    } else {
        const divToDelete = divisiones.find(d => d.id === deleteModal.id);
        const success = await onDeleteDivision(deleteModal.id);
        
        if(success) {
            // Normalizar la categoría para evitar "huecos"
            if (divToDelete) {
                const divsToNormalize = divisiones
                    .filter(d => d.category_id === divToDelete.category_id && d.id !== deleteModal.id)
                    .sort((a, b) => a.tier - b.tier);

                const fullUpdatedArray = divisiones
                    .filter(d => d.id !== deleteModal.id)
                    .map(div => {
                        if (div.category_id === divToDelete.category_id) {
                            const newIndex = divsToNormalize.findIndex(d => d.id === div.id);
                            if (newIndex !== -1) return { ...div, tier: newIndex + 1 };
                        }
                        return div;
                    });

                await updateDivisionTiers(fullUpdatedArray);
            }
            await fetchDivisiones();
        }
    }
    setDeleteModal({ ...deleteModal, open: false });
  };

  // --- DRAG AND DROP MULTI-CATEGORÍA ---
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);
  const dragOverCategory = useRef(null);

  const handleDragStart = (e, categoryId, index, div) => {
    dragItem.current = { categoryId, index, div };
  };

  const handleDragEnter = (e, categoryId, index) => {
    e.stopPropagation();
    dragOverItem.current = { categoryId, index };
    dragOverCategory.current = categoryId;
  };

  const handleDragEnterCategory = (e, categoryId) => {
    e.preventDefault();
    dragOverCategory.current = categoryId;
    dragOverItem.current = null;
  };

  const handleDragEnd = () => {
    const source = dragItem.current;
    const targetCatId = dragOverCategory.current;
    
    if (!source || !targetCatId) {
      resetDragRefs();
      return;
    }

    if (source.categoryId !== targetCatId) {
      // Diferente categoría: Abre modal de mover
      const catDestino = categorias.find(c => c.id === targetCatId);
      setMoveModal({ open: true, source, targetCategoryId: targetCatId, targetCategoryName: catDestino?.name });
    } else {
      // Misma categoría: Reordenamiento y Auto-ajuste automático
      const divsEnCategoria = divisiones.filter(d => d.category_id === source.categoryId).sort((a,b)=> a.tier - b.tier);
      const targetIndex = dragOverItem.current ? dragOverItem.current.index : divsEnCategoria.length - 1;
      
      if (source.index !== targetIndex) {
        const list = [...divsEnCategoria];
        const [draggedItem] = list.splice(source.index, 1);
        list.splice(targetIndex, 0, draggedItem);

        const newDivisionsMap = [...divisiones].map(div => {
          if (div.category_id === source.categoryId) {
            const newIndex = list.findIndex(l => l.id === div.id);
            return { ...div, tier: newIndex + 1 };
          }
          return div;
        });

        updateDivisionTiers(newDivisionsMap);
      }
      resetDragRefs();
    }
  };

  const resetDragRefs = () => {
    dragItem.current = null;
    dragOverItem.current = null;
    dragOverCategory.current = null;
  };

  // --- AUTO-AJUSTE ANTI-FALLAS PARA MOVER ENTRE CATEGORÍAS ---
  const confirmCategoryMove = async () => {
    const { source, targetCategoryId } = moveModal;
    const divsEnDestino = divisiones.filter(d => d.category_id === targetCategoryId);
    const newTier = divsEnDestino.length + 1; // Se pone al final
    
    // 1. Mueve el elemento a la BD
    const success = await onEditDivision(source.div.id, { 
      name: source.div.name, 
      category_id: targetCategoryId,
      tier: newTier
    });

    if(success) {
        // 2. Normaliza los huecos que dejó en la categoría original
        const divsToNormalize = divisiones
            .filter(d => d.category_id === source.categoryId && d.id !== source.div.id)
            .sort((a, b) => a.tier - b.tier);

        const fullUpdatedArray = divisiones.map(div => {
            if (div.id === source.div.id) {
                return { ...div, category_id: targetCategoryId, tier: newTier };
            }
            if (div.category_id === source.categoryId) {
                const newIndex = divsToNormalize.findIndex(d => d.id === div.id);
                if (newIndex !== -1) return { ...div, tier: newIndex + 1 };
            }
            return div;
        });

        // 3. Aplica los niveles corregidos y recarga info real
        await updateDivisionTiers(fullUpdatedArray);
        await fetchDivisiones();
    }

    setMoveModal({ open: false, source: null, targetCategoryId: null, targetCategoryName: '' });
    resetDragRefs();
  };

  if (loading || !categorias) {
    return (
      <Card maxWidth="900px">
        <HeaderContainer>
            <CardHeader Icono={RiBuilding2Line} titulo="Categorías y Divisiones" subtitulo="Gestión de jerarquías" />
            <Skeleton width="160px" height="40px" radius="12px" />
        </HeaderContainer>
        <CategoriesWrapper>
            {[1, 2, 3].map((i) => (
                <Skeleton key={i} width="100%" height="200px" radius="12px" />
            ))}
        </CategoriesWrapper>
      </Card>
    );
  }

  return (
    <Card maxWidth="900px">
        <HeaderContainer>
            <CardHeader Icono={RiBuilding2Line} titulo="Estructura de la Liga" subtitulo="Agrupa en categorías y divisiones" />
            <div className="action-area">
                <BtnGreen 
                    titulo="Nueva Categoría" 
                    icono={<RiAddLine/>} 
                    funcion={() => handleOpen('addCategory')} 
                />
            </div>
        </HeaderContainer>
        
        {categorias.length === 0 && (
            <EmptyMsg>No hay categorías creadas. Comienza agregando una.</EmptyMsg>
        )}

        <CategoriesWrapper>
            {categorias.map((cat) => {
                const divsOfCat = divisiones.filter(d => d.category_id === cat.id).sort((a,b)=> a.tier - b.tier);

                return (
                <CategoryBlock 
                  key={cat.id}
                  onDragEnter={(e) => handleDragEnterCategory(e, cat.id)}
                  onDragOver={(e) => e.preventDefault()}
                >
                    <CategoryHeader>
                        <div className="cat-title">
                            <RiFolder3Line />
                            <h3 title={cat.name}>{cat.name}</h3>
                            <button type="button" className="icon-btn edit-cat" onClick={() => handleOpen('editCategory', cat)} aria-label={`Editar categoría ${cat.name}`}><RiSettings3Line/></button>
                            <button type="button" className="icon-btn del-cat" onClick={() => setDeleteModal({open:true, type:'category', id:cat.id, name:cat.name})} aria-label={`Eliminar categoría ${cat.name}`}><RiDeleteBinLine/></button>
                        </div>
                        <button type="button" className="add-div-btn" onClick={() => handleOpen('addDivision', null, cat)}>
                            <RiAddLine /> <span className="btn-text">Agregar</span>
                        </button>
                    </CategoryHeader>

                    <ListGrid>
                        {divsOfCat.length === 0 && (
                            <div style={{ padding: '10px', opacity: 0.5, fontSize: '13px', fontStyle: 'italic', textAlign: 'center' }}>
                                Arrastra una división aquí o presiona en "Agregar".
                            </div>
                        )}
                        {divsOfCat.map((div, index) => (
                            <ListItem 
                              key={div.id} draggable
                              onDragStart={(e) => handleDragStart(e, cat.id, index, div)}
                              onDragEnter={(e) => handleDragEnter(e, cat.id, index)}
                              onDragEnd={handleDragEnd}
                              onDragOver={(e) => e.preventDefault()}
                            >
                                <div className="drag-handle"><RiDraggable /></div>
                                <div className="info">
                                    <span className="name">{div.name}</span>
                                    <span className="meta">Nivel: {div.tier || index + 1}</span>
                                </div>
                                <div className="actions">
                                    <button type="button" className="btn-edit" onClick={() => handleOpen('editDivision', div)} aria-label={`Editar división ${div.name}`}><RiPencilLine/></button>
                                    <button type="button" className="btn-del" onClick={() => setDeleteModal({open:true, type:'division', id:div.id, name:div.name})} aria-label={`Eliminar división ${div.name}`}><RiDeleteBinLine/></button>
                                </div>
                            </ListItem>
                        ))}
                    </ListGrid>
                </CategoryBlock>
            )})}
        </CategoriesWrapper>

        {/* Modales... */}
        <Modal 
            isOpen={modal.open} onClose={() => setModal({...modal, open:false})} 
            title={
                modal.type === 'addCategory' ? "Nueva Categoría" : 
                modal.type === 'editCategory' ? "Renombrar Categoría" : 
                modal.type === 'addDivision' ? "Nueva División" : "Editar División"
            }
        >
           <ModalContent>
               {(modal.type === 'addCategory' || modal.type === 'editCategory') && (
                   <>
                       {modal.type === 'addCategory' && (
                           <>
                               <span className="field-label">Opciones comunes</span>
                               <PresetsContainer>
                                   {PRESET_CATEGORIES.map(preset => (
                                       <PresetChip
                                           key={preset}
                                           type="button"
                                           $active={categoryName === preset}
                                           onClick={() => setCategoryName(preset)}
                                       >
                                           {preset}
                                       </PresetChip>
                                   ))}
                               </PresetsContainer>
                               <label htmlFor="category-name" style={{ marginTop: '10px' }}>O escribe una personalizada</label>
                           </>
                       )}
                       {modal.type === 'editCategory' && <label htmlFor="category-name">Nombre de la Categoría</label>}
                       
                       <InputText2>
                          <input 
                              id="category-name"
                              className="form__field" 
                              value={categoryName} 
                              onChange={(e)=>setCategoryName(e.target.value)} 
                              autoFocus 
                              placeholder="Ej. Juvenil B" 
                          />
                       </InputText2>
                   </>
               )}

               {(modal.type === 'addDivision' || modal.type === 'editDivision') && (
                   <>
                       <label htmlFor="division-category">Categoría</label>
                       <InputText2>
                          <input id="division-category" className="form__field" value={modal.targetCategory?.name || modal.data?.categories?.name} disabled style={{ opacity: 0.6 }} />
                       </InputText2>
                       <br/>
                       <label htmlFor="division-name">Nombre de la División</label>
                       <InputText2>
                          <input id="division-name" className="form__field" value={formValue} onChange={(e)=>setFormValue(e.target.value)} autoFocus placeholder="Ej. Primera División" />
                       </InputText2>
                   </>
               )}

               <div className="footer-modal">
                   <Btnsave titulo="Guardar" bgcolor={v.colorPrincipal} funcion={handleSubmit} />
               </div>
           </ModalContent>
        </Modal>

        <ConfirmModal 
            isOpen={deleteModal.open} onClose={() => setDeleteModal({...deleteModal, open:false})}
            onConfirm={confirmDelete} 
            title={`Eliminar ${deleteModal.type === 'category' ? 'Categoría' : 'División'}`} 
            message={`¿Eliminar "${deleteModal.name}"? Los torneos/equipos asociados pueden dar error.`}
        />

        <ConfirmModal 
            isOpen={moveModal.open} onClose={() => { setMoveModal({...moveModal, open:false}); resetDragRefs(); }}
            onConfirm={confirmCategoryMove} 
            title="Cambiar de Categoría" 
            message={`¿Mover la división "${moveModal.source?.div?.name}"?`}
            subMessage={`➔ A: "${moveModal.targetCategoryName}"`}
            confirmText="Sí, Mover"
            confirmColor={v.colorPrincipal}
            thinButtons={true}
        />
    </Card>
  );
}

// --- STYLES RESPONSIVE ---
const HeaderContainer = styled.div`
  display: flex; flex-direction: column; gap: 15px; margin-bottom: 25px;
  @media (min-width: 768px) { flex-direction: row; justify-content: space-between; align-items: center; }
  .action-area { display: flex; justify-content: flex-start; @media (min-width: 768px) { justify-content: flex-end; } }
`;

// Usamos Flexbox para un flujo natural y no forzado
const CategoriesWrapper = styled.div` 
  display: flex; 
  flex-wrap: wrap; /* Permite que bajen de línea si no caben */
  gap: 20px; 
  align-items: flex-start; 
`;

const CategoryBlock = styled.div`
  background: ${({theme}) => theme.bgtotal};
  border: 1px solid ${({theme}) => theme.bg4};
  border-radius: 12px;
  padding: 15px 20px;
  display: flex;
  flex-direction: column;
  
  /* MAGIA FLEXBOX:
     1. 'flex-grow: 1' (Toma el espacio que sobre)
     2. 'flex-basis: 260px' (Intenta medir 260px, lo que acomoda ~3 en tu Card de 900px)
     Resultado: 1 carta = 100%, 2 cartas = 50%, 3 cartas = 33% 
  */
  flex: 1 1 260px;
  max-width: 100%;
`;

const CategoryHeader = styled.div`
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;
  border-bottom: 1px solid ${({theme}) => theme.bg4}; padding-bottom: 10px;
  gap: 10px;
  
  .cat-title {
    display: flex; align-items: center; gap: 8px; color: ${({theme}) => theme.text};
    flex: 1; min-width: 0; /* Permite que el texto se acorte si la tarjeta se hace pequeña */
    
    h3 { 
        margin: 0; font-size: 15px; font-weight: 700; margin-right: 5px; 
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    
    svg { font-size: 18px; color: ${({theme}) => theme.primary}; flex-shrink: 0; }
    
    .icon-btn { background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; transition: 0.2s; flex-shrink: 0;}
    .edit-cat { color: ${({theme}) => theme.text}; opacity: 0.5; &:hover { opacity: 1; color: ${({theme}) => theme.primary};} }
    .del-cat { color: ${({theme}) => theme.text}; opacity: 0.5; &:hover { opacity: 1; color: ${v.rojo};} }
  }
  
  .add-div-btn {
    background: transparent; border: 1px dashed ${({theme}) => theme.bg4}; color: ${({theme}) => theme.text};
    display: flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 6px; cursor: pointer;
    font-size: 12px; transition: 0.2s; flex-shrink: 0;
    &:hover { border-color: ${({theme}) => theme.primary}; color: ${({theme}) => theme.primary}; }
    
    @media (max-width: 400px) {
        .btn-text { display: none; }
        padding: 5px 8px;
    }
  }
`;

const ListGrid = styled.div` display: flex; flex-direction: column; gap: 10px; min-height: 50px; `;

const ListItem = styled.div`
    display: flex; align-items: center; padding: 12px 15px; border-radius: 8px;
    background: ${({theme}) => theme.bgcards}; border: 1px solid transparent; cursor: grab;
    &:active { cursor: grabbing; border: 1px dashed ${({theme}) => theme.primary}; opacity: 0.8; }
    
    .drag-handle { margin-right: 15px; color: ${({theme}) => theme.text}; opacity: 0.4; font-size: 18px; }
    .info { 
        display: flex; flex-direction: column; flex: 1; overflow: hidden;
        .name { font-weight: 600; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;} 
        .meta { font-size: 11px; opacity: 0.6; margin-top: 2px; } 
    }
    
    .actions { 
      display: flex; gap: 4px; 
      button { border: none; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s;} 
      .btn-edit { color: ${({theme})=>theme.primary}; background: ${({theme})=>theme.bgtotal}; &:hover{ filter: brightness(1.2); } } 
      .btn-del { color: ${v.rojo}; background: ${({theme})=>theme.bgtotal}; &:hover{ filter: brightness(1.2); } } 
    }
`;

const EmptyMsg = styled.div` width: 100%; text-align: center; padding: 30px; opacity: 0.5; font-style: italic; background: ${({theme})=>theme.bgtotal}; border-radius: 12px; `;
const ModalContent = styled.div` display: flex; flex-direction: column; gap: 5px; padding-top: 10px; .footer-modal { display: flex; justify-content: flex-end; margin-top: 15px; } label, .field-label { font-size: 13px; font-weight: 600; margin-bottom: 2px; }`;

// --- NUEVOS ESTILOS PARA LOS CHIPS (PRESETS) ---
const PresetsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
`;

const PresetChip = styled.button`
  background: ${({ $active, theme }) => $active ? theme.primary : 'transparent'};
  color: ${({ $active, theme }) => $active ? '#fff' : theme.text};
  border: 1px solid ${({ $active, theme }) => $active ? theme.primary : theme.bg4};
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  
  &:hover {
    border-color: ${({ theme }) => theme.primary};
    color: ${({ $active, theme }) => $active ? '#fff' : theme.primary};
  }
`;
