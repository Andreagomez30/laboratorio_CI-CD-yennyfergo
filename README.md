🚀 Workshop: Arquitectura Serverless con CI/CD en AWS
Este guía detalla los pasos para construir una arquitectura serverless con un flujo de Integración y Despliegue Continuo (CI/CD) utilizando servicios nativos de AWS y replicación para recuperación ante desastres (DRP).

________________________________________________________________________________________________________________________________________________________________________

1. Configuración del Almacenamiento (S3)
Primero, crearemos el balde (bucket) donde se alojarán los artefactos de GitHub y el resultado de la compilación (build).

Nombre del Bucket: deployment-artifacts-${AWS:AccountId}

________________________________________________________________________________________________________________________________________________________________________

2. Configuración de Roles y Permisos (IAM)
A. Rol: PipelineDeploymentRole
Este rol permite que AWS CodePipeline gestione los recursos necesarios.

Relación de Confianza:

{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "codepipeline.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
_______________________________________________________________________________________________________________________________________________________________________

