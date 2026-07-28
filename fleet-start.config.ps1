# Per-repo fleet start config for grandorgue-mcp
# Edit ports/backend target here - start.ps1 is fleet-standard.
@{
    Name         = 'grandorgue-mcp'
    BackendPort  = 11010
    FrontendPort = 11011
    HealthPath   = '/health'
    WebRoot      = 'D:\Dev\repos\grandorgue-mcp\web_sota'
    Backend = @{
        Kind          = 'uvicorn'
        UvicornTarget = 'grandorgue_mcp.server:app'
        SyncExtras    = @('dev')
        Env           = @{ WEB_PORT = '11010' }
    }
    Frontend = @{
        Kind           = 'vite-npm'
        PackageManager = 'npm'
        PortEnvVar     = 'VITE_PORT'
        ApiTargetEnv   = 'VITE_API_TARGET'
    }
}
