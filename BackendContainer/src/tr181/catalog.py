"""
TR-181 parameter catalog service.
Handles loading, searching, and validating TR-181 data model parameters.
"""
import logging
from typing import Any, Dict, List, Optional, Set

logger = logging.getLogger(__name__)


class TR181CatalogError(Exception):
    """Raised when TR-181 catalog operations fail."""
    pass


class TR181Catalog:
    """
    TR-181 data model parameter catalog.
    
    Provides:
    - Parameter search by path prefix, type, vendor, profile
    - Tree structure building by path segments
    - Validation of parameter paths and types
    """
    
    def __init__(self):
        """Initialize TR-181 catalog."""
        self._parameters: Dict[str, Dict[str, Any]] = {}
        self._loaded = False
    
    def load_seed_data(self, source: str = "builtin") -> int:
        """
        Load seed TR-181 parameters from a source.
        
        Args:
            source: Source identifier (e.g., 'builtin', 'bbf', 'custom')
            
        Returns:
            Number of parameters loaded
        """
        logger.info(f"Loading TR-181 seed data from source: {source}")
        
        # In a real implementation, this would:
        # 1. Load TR-181 XML schema files (e.g., from Broadband Forum)
        # 2. Parse the data model definitions
        # 3. Extract all parameters with their types, access, descriptions
        
        # For now, load example seed data
        seed_params = self._get_builtin_seed_parameters()
        
        for param in seed_params:
            self._parameters[param['path']] = param
        
        self._loaded = True
        return len(seed_params)
    
    def _get_builtin_seed_parameters(self) -> List[Dict[str, Any]]:
        """Get built-in TR-181 seed parameters for demonstration."""
        return [
            {
                'path': 'Device.DeviceInfo.Manufacturer',
                'schema': {
                    'type': 'string',
                    'access': 'readOnly',
                    'description': 'Device manufacturer name'
                }
            },
            {
                'path': 'Device.DeviceInfo.ModelName',
                'schema': {
                    'type': 'string',
                    'access': 'readOnly',
                    'description': 'Device model name'
                }
            },
            {
                'path': 'Device.DeviceInfo.SerialNumber',
                'schema': {
                    'type': 'string',
                    'access': 'readOnly',
                    'description': 'Device serial number'
                }
            },
            {
                'path': 'Device.DeviceInfo.SoftwareVersion',
                'schema': {
                    'type': 'string',
                    'access': 'readOnly',
                    'description': 'Current software version'
                }
            },
            {
                'path': 'Device.WiFi.Radio.1.Enable',
                'schema': {
                    'type': 'boolean',
                    'access': 'readWrite',
                    'description': 'Enable or disable WiFi radio'
                }
            },
            {
                'path': 'Device.WiFi.Radio.1.Channel',
                'schema': {
                    'type': 'unsignedInt',
                    'access': 'readWrite',
                    'description': 'WiFi channel number'
                }
            },
            {
                'path': 'Device.IP.Interface.1.IPv4Address.1.IPAddress',
                'schema': {
                    'type': 'string',
                    'access': 'readWrite',
                    'description': 'IPv4 address'
                }
            }
        ]
    
    def search_parameters(
        self,
        path_prefix: Optional[str] = None,
        param_type: Optional[str] = None,
        access: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Search TR-181 parameters by filters.
        
        Args:
            path_prefix: Filter by path prefix (e.g., 'Device.WiFi')
            param_type: Filter by type (e.g., 'string', 'boolean')
            access: Filter by access level (e.g., 'readOnly', 'readWrite')
            
        Returns:
            List of matching parameters
        """
        results = []
        
        for path, param in self._parameters.items():
            # Apply filters
            if path_prefix and not path.startswith(path_prefix):
                continue
            
            schema = param.get('schema', {})
            
            if param_type and schema.get('type') != param_type:
                continue
            
            if access and schema.get('access') != access:
                continue
            
            results.append({
                'path': path,
                'schema': schema
            })
        
        return results
    
    def build_tree(self, root_path: str = "Device") -> Dict[str, Any]:
        """
        Build a hierarchical tree structure from TR-181 paths.
        
        Args:
            root_path: Root path to start tree from (default: 'Device')
            
        Returns:
            Tree structure dictionary
        """
        tree: Dict[str, Any] = {
            'path': root_path,
            'name': root_path.split('.')[-1],
            'children': [],
            'is_leaf': False
        }
        
        # Filter parameters under root path
        relevant_params = [
            (path, param) for path, param in self._parameters.items()
            if path.startswith(root_path + '.')
        ]
        
        # Build tree structure
        self._build_tree_recursive(tree, relevant_params, root_path)
        
        return tree
    
    def _build_tree_recursive(
        self,
        node: Dict[str, Any],
        parameters: List[tuple],
        current_path: str
    ) -> None:
        """Recursively build tree structure."""
        # Group by next segment
        segments: Dict[str, List[tuple]] = {}
        
        for path, param in parameters:
            if not path.startswith(current_path + '.'):
                continue
            
            # Get next segment after current path
            remainder = path[len(current_path) + 1:]
            next_segment = remainder.split('.')[0]
            
            if next_segment not in segments:
                segments[next_segment] = []
            segments[next_segment].append((path, param))
        
        # Create child nodes
        for segment, child_params in segments.items():
            child_path = f"{current_path}.{segment}"
            
            # Check if this is a leaf (exact match to a parameter)
            is_leaf = any(path == child_path for path, _ in child_params)
            
            child_node = {
                'path': child_path,
                'name': segment,
                'children': [],
                'is_leaf': is_leaf
            }
            
            if is_leaf:
                # Add schema for leaf nodes
                for path, param in child_params:
                    if path == child_path:
                        child_node['schema'] = param.get('schema', {})
                        break
            
            # Recurse for children
            if not is_leaf:
                self._build_tree_recursive(child_node, child_params, child_path)
            
            node['children'].append(child_node)
    
    def validate_parameters(self, parameters: Dict[str, Any]) -> tuple[bool, List[Dict[str, str]]]:
        """
        Validate a set of parameter paths and values.
        
        Args:
            parameters: Dictionary of path -> value mappings
            
        Returns:
            Tuple of (is_valid, list of errors)
        """
        errors = []
        
        for path, value in parameters.items():
            # Check if path exists
            if path not in self._parameters:
                errors.append({
                    'path': path,
                    'error': f'Unknown parameter path: {path}'
                })
                continue
            
            # Get schema
            schema = self._parameters[path].get('schema', {})
            
            # Check access level
            access = schema.get('access', 'readOnly')
            if access == 'readOnly':
                errors.append({
                    'path': path,
                    'error': 'Parameter is read-only'
                })
                continue
            
            # Validate type (basic validation)
            param_type = schema.get('type')
            if param_type == 'boolean' and not isinstance(value, bool):
                errors.append({
                    'path': path,
                    'error': f'Expected boolean, got {type(value).__name__}'
                })
            elif param_type in ['int', 'unsignedInt'] and not isinstance(value, int):
                errors.append({
                    'path': path,
                    'error': f'Expected integer, got {type(value).__name__}'
                })
            elif param_type == 'string' and not isinstance(value, str):
                errors.append({
                    'path': path,
                    'error': f'Expected string, got {type(value).__name__}'
                })
        
        return len(errors) == 0, errors
    
    def get_parameter(self, path: str) -> Optional[Dict[str, Any]]:
        """
        Get a single parameter by path.
        
        Args:
            path: TR-181 parameter path
            
        Returns:
            Parameter dictionary or None if not found
        """
        return self._parameters.get(path)


# PUBLIC_INTERFACE
def create_tr181_catalog() -> TR181Catalog:
    """
    Create a TR-181 catalog instance.
    
    Returns:
        TR181Catalog instance
    """
    return TR181Catalog()
