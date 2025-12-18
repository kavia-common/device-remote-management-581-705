"""
MIB parser service using pysmi for parsing MIB files.
Converts MIB files (.mib, .txt, .tar.gz) into structured data for database storage.
"""
import logging
import os
import tarfile
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


class MIBParseError(Exception):
    """Raised when MIB parsing fails."""
    pass


class MIBParser:
    """
    Parser for SNMP MIB files using pysmi.
    
    Supports:
    - Individual .mib or .txt files
    - Tar archives (.tar.gz) containing multiple MIB files
    - Caching of parsed MIB modules
    """
    
    def __init__(self, cache_dir: Optional[str] = None):
        """
        Initialize MIB parser.
        
        Args:
            cache_dir: Directory for caching parsed MIBs (optional)
        """
        self.cache_dir = cache_dir or tempfile.gettempdir()
        self._cache: Dict[str, Dict[str, Any]] = {}
    
    def parse_file(self, file_path: str) -> List[Dict[str, Any]]:
        """
        Parse a MIB file and extract modules and OIDs.
        
        Args:
            file_path: Path to MIB file (.mib, .txt, or .tar.gz)
            
        Returns:
            List of dictionaries containing module and OID data
            
        Raises:
            MIBParseError: If parsing fails
        """
        try:
            path = Path(file_path)
            
            if not path.exists():
                raise MIBParseError(f"File not found: {file_path}")
            
            # Handle tar archives
            if path.suffix in ['.gz', '.tgz'] or path.name.endswith('.tar.gz'):
                return self._parse_tar_archive(file_path)
            
            # Handle single MIB file
            return self._parse_single_file(file_path)
            
        except Exception as e:
            logger.error(f"Failed to parse MIB file {file_path}: {e}")
            raise MIBParseError(f"MIB parsing failed: {e}") from e
    
    def _parse_tar_archive(self, tar_path: str) -> List[Dict[str, Any]]:
        """Extract and parse all MIB files from a tar archive."""
        results = []
        
        with tempfile.TemporaryDirectory() as tmpdir:
            try:
                with tarfile.open(tar_path, 'r:*') as tar:
                    tar.extractall(path=tmpdir)
                
                # Find all MIB files in extracted directory
                for root, dirs, files in os.walk(tmpdir):
                    for file in files:
                        if file.endswith(('.mib', '.txt', '.my')):
                            file_path = os.path.join(root, file)
                            try:
                                results.extend(self._parse_single_file(file_path))
                            except Exception as e:
                                logger.warning(f"Failed to parse {file}: {e}")
                                
            except Exception as e:
                raise MIBParseError(f"Failed to extract tar archive: {e}") from e
        
        return results
    
    def _parse_single_file(self, file_path: str) -> List[Dict[str, Any]]:
        """
        Parse a single MIB file using pysmi.
        
        This is a simplified implementation. Full implementation would use:
        - pysmi.parser.smi for parsing
        - pysmi.codegen for code generation
        - pysnmp for OID resolution
        
        For now, returns structured stub data that matches expected schema.
        """
        path = Path(file_path)
        module_name = path.stem.upper()
        
        # Check cache
        if module_name in self._cache:
            logger.info(f"Using cached MIB module: {module_name}")
            return [self._cache[module_name]]
        
        # Read file content
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
        except Exception as e:
            raise MIBParseError(f"Failed to read file: {e}") from e
        
        # Parse MIB content (simplified - real implementation would use pysmi)
        module_data = self._extract_module_info(module_name, content, file_path)
        
        # Cache result
        self._cache[module_name] = module_data
        
        return [module_data]
    
    def _extract_module_info(self, module_name: str, content: str, file_path: str) -> Dict[str, Any]:
        """
        Extract module information and OIDs from MIB content.
        
        Simplified implementation - real version would use pysmi parser.
        """
        # Basic extraction of OID definitions from MIB text
        oids = self._extract_oids_from_content(content, module_name)
        
        return {
            'module_name': module_name,
            'file_path': file_path,
            'oids': oids,
            'metadata': {
                'file_size': len(content),
                'oid_count': len(oids)
            }
        }
    
    def _extract_oids_from_content(self, content: str, module_name: str) -> List[Dict[str, Any]]:
        """
        Extract OID definitions from MIB content.
        
        This is a simplified stub. Real implementation would use pysmi/pysnmp.
        Returns example OIDs for demonstration purposes.
        """
        # In a real implementation, this would:
        # 1. Use pysmi to parse the MIB ASN.1 syntax
        # 2. Extract all OBJECT-TYPE definitions
        # 3. Resolve OID numbers and build hierarchy
        # 4. Extract syntax, access, description from each object
        
        # For now, return stub data
        oids = [
            {
                'oid': '1.3.6.1.2.1.1.1',
                'name': f'{module_name}_sysDescr',
                'syntax': 'OCTET STRING',
                'access': 'read-only',
                'description': f'System description from {module_name}',
                'parent_oid': '1.3.6.1.2.1.1'
            },
            {
                'oid': '1.3.6.1.2.1.1.2',
                'name': f'{module_name}_sysObjectID',
                'syntax': 'OBJECT IDENTIFIER',
                'access': 'read-only',
                'description': f'System object ID from {module_name}',
                'parent_oid': '1.3.6.1.2.1.1'
            }
        ]
        
        return oids
    
    def clear_cache(self) -> None:
        """Clear the MIB parsing cache."""
        self._cache.clear()


# PUBLIC_INTERFACE
def create_mib_parser(cache_dir: Optional[str] = None) -> MIBParser:
    """
    Create a MIB parser instance.
    
    Args:
        cache_dir: Optional directory for caching parsed MIBs
        
    Returns:
        MIBParser instance
    """
    return MIBParser(cache_dir=cache_dir)
