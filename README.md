🚀 Workshop: Arquitectura Serverless con CI/CD en AWS
Este guía detalla los pasos para construir una arquitectura serverless con un flujo de Integración y Despliegue Continuo (CI/CD) utilizando servicios nativos de AWS y replicación para recuperación ante desastres (DRP).

1. Configuración del Almacenamiento (S3)
Primero, crearemos el balde (bucket) donde se alojarán los artefactos de GitHub y el resultado de la compilación (build).

Nombre del Bucket: deployment-artifacts-${AWS:AccountId}

2. Configuración de Roles y Permisos (IAM)
A. Rol: PipelineDeploymentRole
Este rol permite que AWS CodePipeline gestione los recursos necesarios.

Relación de Confianza:

JSON
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
Política: PipelineDeploymentPolicy

JSON
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Action": ["iam:PassRole"],
            "Resource": "*",
            "Effect": "Allow",
            "Condition": {
                "StringEqualsIfExists": {
                    "iam:PassedToService": [
                        "cloudformation.amazonaws.com",
                        "ec2.amazonaws.com"
                    ]
                }
            }
        },
        {
            "Action": ["codestar-connections:UseConnection"],
            "Resource": "*",
            "Effect": "Allow"
        },
        {
            "Action": ["ec2:*", "cloudwatch:*", "s3:*", "sns:*", "cloudformation:*"],
            "Resource": "*",
            "Effect": "Allow"
        },
        {
            "Action": ["lambda:InvokeFunction", "lambda:ListFunctions"],
            "Resource": "*",
            "Effect": "Allow"
        },
        {
            "Action": [
                "cloudformation:CreateStack", "cloudformation:DeleteStack", 
                "cloudformation:DescribeStacks", "cloudformation:UpdateStack",
                "cloudformation:CreateChangeSet", "cloudformation:DeleteChangeSet",
                "cloudformation:DescribeChangeSet", "cloudformation:ExecuteChangeSet",
                "cloudformation:SetStackPolicy", "cloudformation:ValidateTemplate"
            ],
            "Resource": "*",
            "Effect": "Allow"
        },
        {
            "Action": [
                "codebuild:BatchGetBuilds", "codebuild:StartBuild",
                "codebuild:BatchGetBuildBatches", "codebuild:StartBuildBatch"
            ],
            "Resource": "*",
            "Effect": "Allow"
        },
        {
            "Effect": "Allow",
            "Action": [
                "servicecatalog:ListProvisioningArtifacts", "servicecatalog:CreateProvisioningArtifact",
                "servicecatalog:DescribeProvisioningArtifact", "servicecatalog:DeleteProvisioningArtifact",
                "servicecatalog:UpdateProduct"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": ["ecr:DescribeImages"],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": ["states:DescribeExecution", "states:DescribeStateMachine", "states:StartExecution"],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": ["appsync:*"],
            "Resource": "*"
        }
    ]
}
B. Rol: CfnDeployerRole
Este rol es utilizado por CloudFormation para desplegar los recursos de la aplicación.

Relación de Confianza:

JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "",
      "Effect": "Allow",
       "Principal": {
         "Service": "cloudformation.amazonaws.com"
       },
       "Action": "sts:AssumeRole"
     }
  ]
}
Política: CloudFormationDeployerPolicy

JSON
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "VisualEditor0",
            "Effect": "Allow",
            "Action": [
                "apigateway:*", "cloudformation:CreateStack", "lambda:*",
                "cloudformation:UpdateStack", "dynamodb:*", "cloudformation:UpdateStackSet",
                "cloudformation:CreateChangeSet", "cloudformation:ExecuteChangeSet",
                "cloudformation:CreateStackSet", "iam:GetRole", "iam:CreateRole",
                "iam:DeleteRolePolicy", "iam:DetachRolePolicy", "iam:PutRolePolicy",
                "iam:DeleteRole", "iam:AttachRolePolicy", "iam:PassRole",
                "logs:CreateLogGroup", "logs:PutRetentionPolicy"
            ],
            "Resource": "*"
        }
    ]
}
Política: GetArtifacts (Añadir a CfnDeployerRole y CodebuildContactRole)  

JSON
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Resource": [
                "arn:aws:s3:::deployment-artifacts-${AWS:AccountId}/*"
            ],
            "Action": ["s3:GetObject", "s3:PutObject"]
        }
    ]
}
3. Especificación de Compilación (Buildspec)
Archivo buildspec.yml estándar para la fase de CodeBuild.

YAML
version: 0.2
phases:
  install:
    commands:
      - yarn install
  build:
    commands:
      - yarn build
  post_build:
    commands:
      - aws cloudformation package --template template.yml --s3-bucket $S3Bucket --output-template package.yml
artifacts:
  files:
    - package.yml
  discard-paths: yes
4. Plan de Recuperación ante Desastres (DRP)
Configuración Regional
Crear Bucket en Región Secundaria (US West - N. California / us-west-1): deployment-artifacts-${AWS:AccountId}-drp

Actualizar Políticas: Asegurar que CfnDeployerRole y CodebuildContactRole tengan acceso al nuevo bucket -drp.

Actualización del Pipeline para Multi-Región
Obtener configuración:
aws codepipeline get-pipeline --name MiNombreDePipeline

Cambiar el atributo artifactStore por artifactStores:

JSON
{        
    "us-east-1": {    
        "type": "S3",    
        "location": "deployment-artifacts-${AWS:accountId}"    
    },        
    "us-west-1": {    
        "type": "S3",    
        "location": "deployment-artifacts-${AWS:accountId}-drp"    
    }    
}
Ejecutar actualización:
aws codepipeline update-pipeline --cli-input-json '{"pipeline": {...}}'

Buildspec con Replicación Regional
YAML
version: 0.2
phases:
  install:
    commands:
      - yarn install
  build:
    commands:
      - yarn build
  post_build:
    commands:
      - aws cloudformation package --template template.yml --s3-bucket $S3Bucket --output-template package.yml
      - aws cloudformation --region us-west-1 package --template template.yml --s3-bucket $S3BucketDRP --output-template package-drp.yml
artifacts:
  files:
    - package.yml
    - package-drp.yml
  discard-paths: yes
5. Integración con GitHub Actions (Opcional)
Configuración de Proveedor de Identidad (OIDC)
Ir a la consola de IAM -> Proveedores de identidad -> Añadir proveedor.

Tipo: OpenID Connect.

URL del proveedor: https://token.actions.githubusercontent.com

Audiencia: sts.amazonaws.com

Rol para GitHub Actions
Asignar una política que permita iniciar el pipeline.

Política: StartAnyCodepipeline

JSON
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Resource": "arn:aws:codepipeline:*:${AWS:AccountId}:*",
            "Action": "codepipeline:StartPipelineExecution"
        }
    ]
}
Configuración en GitHub
En el repositorio: Settings -> Secrets and variables -> Actions.

Secretos (Secrets):

AWS_ROLE_TO_ASSUME: ARN del rol creado asociado al proveedor de identidad.

Variables:

AWS_CONTACT_PIPELINE_NAME: Nombre del pipeline de AWS CodePipeline.

Nota: Las "Actions" deben estar activadas en la configuración del repositorio.
