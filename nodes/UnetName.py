import folder_paths
from typing import Tuple, Dict, Any

WEB_DIRECTORY = "./js"

def get_unet_list() -> list[str]:
	"""Retrieves a list of available UNet models from ComfyUI directories."""
	files = []
	for key in ("unet", "unet_gguf", "diffusion_models"):
		if key in folder_paths.folder_names_and_paths:
			files.extend(folder_paths.get_filename_list(key))
	files = sorted(set(files))
	return files if files else ["No models found"]


class UNetNames:
	"""Utility node to retrieve names of available UNet models."""
	
	@classmethod
	def INPUT_TYPES(cls) -> Dict[str, Any]:
		return {"required": {"unet_name": (get_unet_list(),)}}

	RETURN_TYPES = ("STRING",)
	RETURN_NAMES = ("unet_name",)
	FUNCTION = "get_name"
	CATEGORY = "Multi Route Tools"
	TITLE = "UNet Names"

	def get_name(self, unet_name: str) -> Tuple[str]:
		return (unet_name,)

NODE_CLASS_MAPPINGS = {
	"UNetNames":			 UNetNames,
}

NODE_DISPLAY_NAME_MAPPINGS = {
	"UNetNames":			 "UNet Names",
}