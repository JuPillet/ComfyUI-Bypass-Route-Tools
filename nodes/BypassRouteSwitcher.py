from typing import Tuple, Dict, Any

class BypassRouteSwitcher:
    @classmethod
    def INPUT_TYPES(cls) -> Dict[str, Any]:
        return {
            "required": {
                # Liste initiale par défaut, le JS va écraser et peupler les choix au runtime
                "controller": (["Select a BypassRouteController..."],),
                # L'index qui correspond au widget "index" récupéré et configuré par le JS
                "index": ("INT", {"default": 1, "min": 1, "max": 64, "step": 1}),
            },
            "hidden": {
                "unique_id": "UNIQUE_ID",
                "extra_pnginfo": "EXTRA_PNGINFO"
            }
        }

    RETURN_TYPES = ("ANY",)
    RETURN_NAMES = ("output",)
    FUNCTION = "route"
    CATEGORY = "Bypass Route Tools"
    TITLE = "Bypass Route Switcher"

    def route(self, controller: str, index: int, **kwargs) -> Tuple[Any]:
        # Le JS génère des entrées nommées "input_1", "input_2", etc.
        input_name = f"input_{index}"
        
        # On récupère la valeur connectée à l'entrée dynamique correspondante
        value = kwargs.get(input_name, None)
        return (value,)

    @classmethod
    def VALIDATE_INPUTS(cls, **kwargs) -> bool:
        """
        FORCE LA VALIDATION : Indispensable pour éviter l'erreur 'Value not in list' 
        de ComfyUI puisque les choix du menu déroulant changent dynamiquement côté JS.
        """
        return True

    @classmethod
    def IS_CHANGED(cls, **kwargs) -> float:
        """
        Force l'exécution du nœud pour assurer la réactivité en temps réel 
        lorsque les chemins ou index changent.
        """
        return float("nan")


NODE_CLASS_MAPPINGS = {"BypassRouteSwitcher": BypassRouteSwitcher}
NODE_DISPLAY_NAME_MAPPINGS = {"BypassRouteSwitcher": "Bypass Route Switcher"}