# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.hooks import copy_metadata

datas = [('src/grandorgue_mcp', 'grandorgue_mcp')]
datas += copy_metadata('fastmcp')
datas += copy_metadata('fastapi')


a = Analysis(
    ['run_server.py'],
    pathex=[],
    
    binaries=[],
    
    datas=datas,
    hiddenimports=['uvicorn.logging',
    "_strptime",
],
hookspath=[],
    
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=True,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    
    name='grandorgue-mcp-backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)








