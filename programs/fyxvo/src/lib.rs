use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount, TransferChecked};
use solana_security_txt::security_txt;

declare_id!("Gsi8tsTm7BinEgcYd1Uc4wtNBjMrjYfbtKdoDpGdvkJc");

security_txt! {
    name: "Fyxvo",
    project_url: "https://www.fyxvo.com",
    contacts: "email:security@fyxvo.com,link:https://www.fyxvo.com/security,discord:https://discord.gg/Uggu236Jgj,twitter:https://x.com/fyxvo",
    policy: "https://www.fyxvo.com/security",
    source_code: "https://github.com/fyxvo/fyxvo-platform",
    preferred_languages: "en"
}

const BASIS_POINTS_DENOMINATOR: u128 = 10_000;
const PROTOCOL_CONFIG_SEED: &[u8] = b"protocol-config";
const TREASURY_SEED: &[u8] = b"treasury";
const OPERATOR_REGISTRY_SEED: &[u8] = b"operator-registry";
const PROJECT_SEED: &[u8] = b"project";
const OPERATOR_SEED: &[u8] = b"operator";
const REWARD_SEED: &[u8] = b"reward";

#[program]
pub mod fyxvo {
    use super::*;

    pub fn initialize_protocol(
        ctx: Context<InitializeProtocol>,
        admin_authority: Pubkey,
        fee_bps: u16,
    ) -> Result<()> {
        require!(fee_bps <= 2_000, FyxvoError::FeeTooHigh);

        let protocol_config = &mut ctx.accounts.protocol_config;
        let treasury = &mut ctx.accounts.treasury;
        let operator_registry = &mut ctx.accounts.operator_registry;

        protocol_config.authority = admin_authority;
        protocol_config.treasury = treasury.key();
        protocol_config.operator_registry = operator_registry.key();
        protocol_config.usdc_mint = ctx.accounts.usdc_mint.key();
        protocol_config.fee_bps = fee_bps;
        protocol_config.paused = false;
        protocol_config.bump = ctx.bumps.protocol_config;

        treasury.protocol_config = protocol_config.key();
        treasury.usdc_vault = ctx.accounts.treasury_usdc_vault.key();
        treasury.sol_balance = 0;
        treasury.usdc_balance = 0;
        treasury.reserved_sol_rewards = 0;
        treasury.reserved_usdc_rewards = 0;
        treasury.protocol_sol_fees_owed = 0;
        treasury.protocol_usdc_fees_owed = 0;
        treasury.bump = ctx.bumps.treasury;

        operator_registry.protocol_config = protocol_config.key();
        operator_registry.total_registered = 0;
        operator_registry.bump = ctx.bumps.operator_registry;

        Ok(())
    }

    pub fn set_protocol_pause(
        ctx: Context<SetProtocolPause>,
        paused: bool,
    ) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.authority.key(),
            ctx.accounts.protocol_config.authority,
            FyxvoError::Unauthorized
        );

        ctx.accounts.protocol_config.paused = paused;
        Ok(())
    }

    pub fn create_project(
        ctx: Context<CreateProject>,
        project_id: u64,
    ) -> Result<()> {
        require!(!ctx.accounts.protocol_config.paused, FyxvoError::ProgramPaused);

        let project = &mut ctx.accounts.project;
        project.protocol_config = ctx.accounts.protocol_config.key();
        project.treasury = ctx.accounts.treasury.key();
        project.owner = ctx.accounts.project_owner.key();
        project.project_id = project_id;
        project.total_sol_funded = 0;
        project.total_usdc_funded = 0;
        project.available_sol_balance = 0;
        project.available_usdc_balance = 0;
        project.outstanding_sol_rewards = 0;
        project.outstanding_usdc_rewards = 0;
        project.total_sol_rewards_accrued = 0;
        project.total_usdc_rewards_accrued = 0;
        project.bump = ctx.bumps.project;
        Ok(())
    }

    pub fn deposit_sol(ctx: Context<DepositSol>, amount: u64) -> Result<()> {
        require!(!ctx.accounts.protocol_config.paused, FyxvoError::ProgramPaused);
        require!(amount > 0, FyxvoError::InvalidAmount);

        let protocol_config = &ctx.accounts.protocol_config;
        let treasury = &mut ctx.accounts.treasury;
        let project = &mut ctx.accounts.project;
        let (fee_amount, net_amount) = calculate_fee(amount, protocol_config.fee_bps)?;

        let transfer_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.funder.to_account_info(),
                to: treasury.to_account_info(),
            },
        );
        anchor_lang::system_program::transfer(transfer_context, amount)?;

        treasury.sol_balance = checked_add(treasury.sol_balance, net_amount)?;
        treasury.protocol_sol_fees_owed = checked_add(treasury.protocol_sol_fees_owed, fee_amount)?;
        project.total_sol_funded = checked_add(project.total_sol_funded, net_amount)?;
        project.available_sol_balance = checked_add(project.available_sol_balance, net_amount)?;

        emit!(Deposit {
            project: project.key(),
            funder: ctx.accounts.funder.key(),
            asset: FundingAsset::Sol,
            gross_amount: amount,
            fee_amount,
            net_amount,
            treasury_balance: treasury.sol_balance,
        });

        Ok(())
    }

    pub fn deposit_usdc(ctx: Context<DepositUsdc>, amount: u64) -> Result<()> {
        require!(!ctx.accounts.protocol_config.paused, FyxvoError::ProgramPaused);
        require!(amount > 0, FyxvoError::InvalidAmount);

        let protocol_config = &ctx.accounts.protocol_config;
        let treasury = &mut ctx.accounts.treasury;
        let project = &mut ctx.accounts.project;
        let (fee_amount, net_amount) = calculate_fee(amount, protocol_config.fee_bps)?;

        let transfer_accounts = TransferChecked {
            from: ctx.accounts.funder_usdc_account.to_account_info(),
            to: ctx.accounts.treasury_usdc_vault.to_account_info(),
            authority: ctx.accounts.funder.to_account_info(),
            mint: ctx.accounts.usdc_mint.to_account_info(),
        };
        token::transfer_checked(
            CpiContext::new(ctx.accounts.token_program.to_account_info(), transfer_accounts),
            amount,
            ctx.accounts.usdc_mint.decimals,
        )?;

        treasury.usdc_balance = checked_add(treasury.usdc_balance, net_amount)?;
        treasury.protocol_usdc_fees_owed =
            checked_add(treasury.protocol_usdc_fees_owed, fee_amount)?;
        project.total_usdc_funded = checked_add(project.total_usdc_funded, net_amount)?;
        project.available_usdc_balance = checked_add(project.available_usdc_balance, net_amount)?;

        emit!(Deposit {
            project: project.key(),
            funder: ctx.accounts.funder.key(),
            asset: FundingAsset::Usdc,
            gross_amount: amount,
            fee_amount,
            net_amount,
            treasury_balance: treasury.usdc_balance,
        });

        Ok(())
    }

    pub fn register_operator(ctx: Context<RegisterOperator>) -> Result<()> {
        require!(!ctx.accounts.protocol_config.paused, FyxvoError::ProgramPaused);

        let registry = &mut ctx.accounts.operator_registry;
        let operator_account = &mut ctx.accounts.operator_account;
        let reward_account = &mut ctx.accounts.reward_account;
        let clock = Clock::get()?;

        registry.total_registered = checked_add(registry.total_registered, 1)?;

        operator_account.registry = registry.key();
        operator_account.project = ctx.accounts.project.key();
        operator_account.operator = ctx.accounts.operator.key();
        operator_account.reward_account = reward_account.key();
        operator_account.total_sol_claimed = 0;
        operator_account.total_usdc_claimed = 0;
        operator_account.registered_at = clock.unix_timestamp;
        operator_account.bump = ctx.bumps.operator_account;

        reward_account.project = ctx.accounts.project.key();
        reward_account.operator_account = operator_account.key();
        reward_account.operator = ctx.accounts.operator.key();
        reward_account.accrued_sol = 0;
        reward_account.accrued_usdc = 0;
        reward_account.claimed_sol = 0;
        reward_account.claimed_usdc = 0;
        reward_account.bump = ctx.bumps.reward_account;

        emit!(OperatorRegistered {
            project: ctx.accounts.project.key(),
            operator: ctx.accounts.operator.key(),
            operator_account: operator_account.key(),
        });

        Ok(())
    }

    pub fn accrue_reward(
        ctx: Context<AccrueReward>,
        asset: FundingAsset,
        amount: u64,
    ) -> Result<()> {
        require!(!ctx.accounts.protocol_config.paused, FyxvoError::ProgramPaused);
        require!(amount > 0, FyxvoError::InvalidAmount);
        require_keys_eq!(
            ctx.accounts.project_owner.key(),
            ctx.accounts.project.owner,
            FyxvoError::Unauthorized
        );

        let treasury = &mut ctx.accounts.treasury;
        let project = &mut ctx.accounts.project;
        let operator_account = &ctx.accounts.operator_account;
        let reward_account = &mut ctx.accounts.reward_account;

        match asset {
            FundingAsset::Sol => {
                project.available_sol_balance =
                    checked_sub(project.available_sol_balance, amount)?;
                project.outstanding_sol_rewards =
                    checked_add(project.outstanding_sol_rewards, amount)?;
                project.total_sol_rewards_accrued =
                    checked_add(project.total_sol_rewards_accrued, amount)?;
                treasury.reserved_sol_rewards =
                    checked_add(treasury.reserved_sol_rewards, amount)?;
                reward_account.accrued_sol = checked_add(reward_account.accrued_sol, amount)?;

                emit!(RewardAccrued {
                    project: project.key(),
                    operator: operator_account.operator,
                    asset,
                    amount,
                    total_accrued: reward_account.accrued_sol,
                });
            }
            FundingAsset::Usdc => {
                project.available_usdc_balance =
                    checked_sub(project.available_usdc_balance, amount)?;
                project.outstanding_usdc_rewards =
                    checked_add(project.outstanding_usdc_rewards, amount)?;
                project.total_usdc_rewards_accrued =
                    checked_add(project.total_usdc_rewards_accrued, amount)?;
                treasury.reserved_usdc_rewards =
                    checked_add(treasury.reserved_usdc_rewards, amount)?;
                reward_account.accrued_usdc = checked_add(reward_account.accrued_usdc, amount)?;

                emit!(RewardAccrued {
                    project: project.key(),
                    operator: operator_account.operator,
                    asset,
                    amount,
                    total_accrued: reward_account.accrued_usdc,
                });
            }
        }

        Ok(())
    }

    pub fn claim_sol_reward(ctx: Context<ClaimSolReward>) -> Result<()> {
        require!(!ctx.accounts.protocol_config.paused, FyxvoError::ProgramPaused);
        require_keys_eq!(
            ctx.accounts.operator.key(),
            ctx.accounts.operator_account.operator,
            FyxvoError::Unauthorized
        );

        let treasury = &mut ctx.accounts.treasury;
        let project = &mut ctx.accounts.project;
        let operator_account = &mut ctx.accounts.operator_account;
        let reward_account = &mut ctx.accounts.reward_account;

        let claimable = checked_sub(reward_account.accrued_sol, reward_account.claimed_sol)?;
        require!(claimable > 0, FyxvoError::NothingToClaim);

        transfer_lamports_from_treasury(
            &treasury.to_account_info(),
            &ctx.accounts.operator.to_account_info(),
            claimable,
        )?;

        reward_account.claimed_sol = checked_add(reward_account.claimed_sol, claimable)?;
        operator_account.total_sol_claimed =
            checked_add(operator_account.total_sol_claimed, claimable)?;
        treasury.sol_balance = checked_sub(treasury.sol_balance, claimable)?;
        treasury.reserved_sol_rewards = checked_sub(treasury.reserved_sol_rewards, claimable)?;
        project.outstanding_sol_rewards =
            checked_sub(project.outstanding_sol_rewards, claimable)?;

        emit!(RewardClaimed {
            project: project.key(),
            operator: ctx.accounts.operator.key(),
            asset: FundingAsset::Sol,
            amount: claimable,
            total_claimed: operator_account.total_sol_claimed,
        });

        Ok(())
    }

    pub fn claim_usdc_reward(ctx: Context<ClaimUsdcReward>) -> Result<()> {
        require!(!ctx.accounts.protocol_config.paused, FyxvoError::ProgramPaused);
        require_keys_eq!(
            ctx.accounts.operator.key(),
            ctx.accounts.operator_account.operator,
            FyxvoError::Unauthorized
        );

        let treasury = &mut ctx.accounts.treasury;
        let project = &mut ctx.accounts.project;
        let operator_account = &mut ctx.accounts.operator_account;
        let reward_account = &mut ctx.accounts.reward_account;

        let claimable = checked_sub(reward_account.accrued_usdc, reward_account.claimed_usdc)?;
        require!(claimable > 0, FyxvoError::NothingToClaim);

        let treasury_signer_seeds: &[&[u8]] = &[TREASURY_SEED, &[treasury.bump]];
        let transfer_accounts = TransferChecked {
            from: ctx.accounts.treasury_usdc_vault.to_account_info(),
            to: ctx.accounts.operator_usdc_account.to_account_info(),
            authority: treasury.to_account_info(),
            mint: ctx.accounts.usdc_mint.to_account_info(),
        };

        token::transfer_checked(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                transfer_accounts,
                &[treasury_signer_seeds],
            ),
            claimable,
            ctx.accounts.usdc_mint.decimals,
        )?;

        reward_account.claimed_usdc = checked_add(reward_account.claimed_usdc, claimable)?;
        operator_account.total_usdc_claimed =
            checked_add(operator_account.total_usdc_claimed, claimable)?;
        treasury.usdc_balance = checked_sub(treasury.usdc_balance, claimable)?;
        treasury.reserved_usdc_rewards = checked_sub(treasury.reserved_usdc_rewards, claimable)?;
        project.outstanding_usdc_rewards =
            checked_sub(project.outstanding_usdc_rewards, claimable)?;

        emit!(RewardClaimed {
            project: project.key(),
            operator: ctx.accounts.operator.key(),
            asset: FundingAsset::Usdc,
            amount: claimable,
            total_claimed: operator_account.total_usdc_claimed,
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeProtocol<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + ProtocolConfig::INIT_SPACE,
        seeds = [PROTOCOL_CONFIG_SEED],
        bump
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,
    #[account(
        init,
        payer = authority,
        space = 8 + Treasury::INIT_SPACE,
        seeds = [TREASURY_SEED],
        bump
    )]
    pub treasury: Account<'info, Treasury>,
    #[account(
        init,
        payer = authority,
        space = 8 + OperatorRegistry::INIT_SPACE,
        seeds = [OPERATOR_REGISTRY_SEED, protocol_config.key().as_ref()],
        bump
    )]
    pub operator_registry: Account<'info, OperatorRegistry>,
    pub usdc_mint: Account<'info, Mint>,
    #[account(
        init,
        payer = authority,
        associated_token::mint = usdc_mint,
        associated_token::authority = treasury
    )]
    pub treasury_usdc_vault: Account<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(Accounts)]
pub struct SetProtocolPause<'info> {
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [PROTOCOL_CONFIG_SEED],
        bump = protocol_config.bump
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,
}

#[derive(Accounts)]
#[instruction(project_id: u64)]
pub struct CreateProject<'info> {
    #[account(mut)]
    pub project_owner: Signer<'info>,
    #[account(
        seeds = [PROTOCOL_CONFIG_SEED],
        bump = protocol_config.bump
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,
    #[account(
        mut,
        seeds = [TREASURY_SEED],
        bump = treasury.bump,
        constraint = treasury.protocol_config == protocol_config.key() @ FyxvoError::InvalidTreasury
    )]
    pub treasury: Account<'info, Treasury>,
    #[account(
        init,
        payer = project_owner,
        space = 8 + ProjectAccount::INIT_SPACE,
        seeds = [PROJECT_SEED, project_owner.key().as_ref(), &project_id.to_le_bytes()],
        bump
    )]
    pub project: Account<'info, ProjectAccount>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositSol<'info> {
    #[account(mut)]
    pub funder: Signer<'info>,
    #[account(
        seeds = [PROTOCOL_CONFIG_SEED],
        bump = protocol_config.bump
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,
    #[account(
        mut,
        seeds = [TREASURY_SEED],
        bump = treasury.bump,
        address = protocol_config.treasury @ FyxvoError::InvalidTreasury
    )]
    pub treasury: Account<'info, Treasury>,
    #[account(
        mut,
        constraint = project.protocol_config == protocol_config.key() @ FyxvoError::InvalidProject,
        constraint = project.treasury == treasury.key() @ FyxvoError::InvalidTreasury
    )]
    pub project: Account<'info, ProjectAccount>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositUsdc<'info> {
    #[account(mut)]
    pub funder: Signer<'info>,
    #[account(
        seeds = [PROTOCOL_CONFIG_SEED],
        bump = protocol_config.bump
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,
    #[account(
        mut,
        seeds = [TREASURY_SEED],
        bump = treasury.bump,
        address = protocol_config.treasury @ FyxvoError::InvalidTreasury
    )]
    pub treasury: Account<'info, Treasury>,
    #[account(
        mut,
        constraint = project.protocol_config == protocol_config.key() @ FyxvoError::InvalidProject,
        constraint = project.treasury == treasury.key() @ FyxvoError::InvalidTreasury
    )]
    pub project: Account<'info, ProjectAccount>,
    #[account(address = protocol_config.usdc_mint @ FyxvoError::InvalidMint)]
    pub usdc_mint: Account<'info, Mint>,
    #[account(
        mut,
        constraint = funder_usdc_account.owner == funder.key() @ FyxvoError::InvalidTokenAccount,
        constraint = funder_usdc_account.mint == usdc_mint.key() @ FyxvoError::InvalidMint
    )]
    pub funder_usdc_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        address = treasury.usdc_vault @ FyxvoError::InvalidTokenAccount,
        constraint = treasury_usdc_vault.owner == treasury.key() @ FyxvoError::InvalidTokenAccount,
        constraint = treasury_usdc_vault.mint == usdc_mint.key() @ FyxvoError::InvalidMint
    )]
    pub treasury_usdc_vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct RegisterOperator<'info> {
    #[account(mut)]
    pub operator: Signer<'info>,
    #[account(
        seeds = [PROTOCOL_CONFIG_SEED],
        bump = protocol_config.bump
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,
    #[account(
        mut,
        seeds = [OPERATOR_REGISTRY_SEED, protocol_config.key().as_ref()],
        bump = operator_registry.bump,
        constraint = operator_registry.protocol_config == protocol_config.key() @ FyxvoError::InvalidOperatorRegistry
    )]
    pub operator_registry: Account<'info, OperatorRegistry>,
    #[account(
        constraint = project.protocol_config == protocol_config.key() @ FyxvoError::InvalidProject
    )]
    pub project: Account<'info, ProjectAccount>,
    #[account(
        init,
        payer = operator,
        space = 8 + OperatorAccount::INIT_SPACE,
        seeds = [OPERATOR_SEED, project.key().as_ref(), operator.key().as_ref()],
        bump
    )]
    pub operator_account: Account<'info, OperatorAccount>,
    #[account(
        init,
        payer = operator,
        space = 8 + RewardAccount::INIT_SPACE,
        seeds = [REWARD_SEED, operator_account.key().as_ref()],
        bump
    )]
    pub reward_account: Account<'info, RewardAccount>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AccrueReward<'info> {
    pub project_owner: Signer<'info>,
    #[account(
        seeds = [PROTOCOL_CONFIG_SEED],
        bump = protocol_config.bump
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,
    #[account(
        mut,
        seeds = [TREASURY_SEED],
        bump = treasury.bump,
        address = protocol_config.treasury @ FyxvoError::InvalidTreasury
    )]
    pub treasury: Account<'info, Treasury>,
    #[account(
        mut,
        constraint = project.protocol_config == protocol_config.key() @ FyxvoError::InvalidProject,
        constraint = project.treasury == treasury.key() @ FyxvoError::InvalidTreasury
    )]
    pub project: Account<'info, ProjectAccount>,
    #[account(
        mut,
        seeds = [OPERATOR_SEED, project.key().as_ref(), operator_account.operator.as_ref()],
        bump = operator_account.bump,
        constraint = operator_account.project == project.key() @ FyxvoError::InvalidOperatorAccount
    )]
    pub operator_account: Account<'info, OperatorAccount>,
    #[account(
        mut,
        seeds = [REWARD_SEED, operator_account.key().as_ref()],
        bump = reward_account.bump,
        constraint = reward_account.project == project.key() @ FyxvoError::InvalidRewardAccount,
        constraint = reward_account.operator_account == operator_account.key() @ FyxvoError::InvalidRewardAccount
    )]
    pub reward_account: Account<'info, RewardAccount>,
}

#[derive(Accounts)]
pub struct ClaimSolReward<'info> {
    #[account(mut)]
    pub operator: Signer<'info>,
    #[account(
        seeds = [PROTOCOL_CONFIG_SEED],
        bump = protocol_config.bump
    )]
    pub protocol_config: Box<Account<'info, ProtocolConfig>>,
    #[account(
        mut,
        seeds = [TREASURY_SEED],
        bump = treasury.bump,
        address = protocol_config.treasury @ FyxvoError::InvalidTreasury
    )]
    pub treasury: Box<Account<'info, Treasury>>,
    #[account(
        mut,
        constraint = project.protocol_config == protocol_config.key() @ FyxvoError::InvalidProject,
        constraint = project.treasury == treasury.key() @ FyxvoError::InvalidTreasury
    )]
    pub project: Box<Account<'info, ProjectAccount>>,
    #[account(
        mut,
        seeds = [OPERATOR_SEED, project.key().as_ref(), operator.key().as_ref()],
        bump = operator_account.bump,
        constraint = operator_account.project == project.key() @ FyxvoError::InvalidOperatorAccount
    )]
    pub operator_account: Box<Account<'info, OperatorAccount>>,
    #[account(
        mut,
        seeds = [REWARD_SEED, operator_account.key().as_ref()],
        bump = reward_account.bump,
        constraint = reward_account.project == project.key() @ FyxvoError::InvalidRewardAccount,
        constraint = reward_account.operator == operator.key() @ FyxvoError::InvalidRewardAccount
    )]
    pub reward_account: Box<Account<'info, RewardAccount>>,
}

#[derive(Accounts)]
pub struct ClaimUsdcReward<'info> {
    #[account(mut)]
    pub operator: Signer<'info>,
    #[account(
        seeds = [PROTOCOL_CONFIG_SEED],
        bump = protocol_config.bump
    )]
    pub protocol_config: Box<Account<'info, ProtocolConfig>>,
    #[account(
        mut,
        seeds = [TREASURY_SEED],
        bump = treasury.bump,
        address = protocol_config.treasury @ FyxvoError::InvalidTreasury
    )]
    pub treasury: Box<Account<'info, Treasury>>,
    #[account(
        mut,
        constraint = project.protocol_config == protocol_config.key() @ FyxvoError::InvalidProject,
        constraint = project.treasury == treasury.key() @ FyxvoError::InvalidTreasury
    )]
    pub project: Box<Account<'info, ProjectAccount>>,
    #[account(
        mut,
        seeds = [OPERATOR_SEED, project.key().as_ref(), operator.key().as_ref()],
        bump = operator_account.bump,
        constraint = operator_account.project == project.key() @ FyxvoError::InvalidOperatorAccount
    )]
    pub operator_account: Box<Account<'info, OperatorAccount>>,
    #[account(
        mut,
        seeds = [REWARD_SEED, operator_account.key().as_ref()],
        bump = reward_account.bump,
        constraint = reward_account.project == project.key() @ FyxvoError::InvalidRewardAccount,
        constraint = reward_account.operator == operator.key() @ FyxvoError::InvalidRewardAccount
    )]
    pub reward_account: Box<Account<'info, RewardAccount>>,
    #[account(address = protocol_config.usdc_mint @ FyxvoError::InvalidMint)]
    pub usdc_mint: Box<Account<'info, Mint>>,
    #[account(
        mut,
        address = treasury.usdc_vault @ FyxvoError::InvalidTokenAccount,
        constraint = treasury_usdc_vault.owner == treasury.key() @ FyxvoError::InvalidTokenAccount,
        constraint = treasury_usdc_vault.mint == usdc_mint.key() @ FyxvoError::InvalidMint
    )]
    pub treasury_usdc_vault: Box<Account<'info, TokenAccount>>,
    #[account(
        mut,
        constraint = operator_usdc_account.owner == operator.key() @ FyxvoError::InvalidTokenAccount,
        constraint = operator_usdc_account.mint == usdc_mint.key() @ FyxvoError::InvalidMint
    )]
    pub operator_usdc_account: Box<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
}

#[account]
#[derive(InitSpace)]
pub struct ProtocolConfig {
    pub authority: Pubkey,
    pub treasury: Pubkey,
    pub operator_registry: Pubkey,
    pub usdc_mint: Pubkey,
    pub fee_bps: u16,
    pub paused: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Treasury {
    pub protocol_config: Pubkey,
    pub usdc_vault: Pubkey,
    pub sol_balance: u64,
    pub usdc_balance: u64,
    pub reserved_sol_rewards: u64,
    pub reserved_usdc_rewards: u64,
    pub protocol_sol_fees_owed: u64,
    pub protocol_usdc_fees_owed: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct ProjectAccount {
    pub protocol_config: Pubkey,
    pub treasury: Pubkey,
    pub owner: Pubkey,
    pub project_id: u64,
    pub total_sol_funded: u64,
    pub total_usdc_funded: u64,
    pub available_sol_balance: u64,
    pub available_usdc_balance: u64,
    pub outstanding_sol_rewards: u64,
    pub outstanding_usdc_rewards: u64,
    pub total_sol_rewards_accrued: u64,
    pub total_usdc_rewards_accrued: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct OperatorRegistry {
    pub protocol_config: Pubkey,
    pub total_registered: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct OperatorAccount {
    pub registry: Pubkey,
    pub project: Pubkey,
    pub operator: Pubkey,
    pub reward_account: Pubkey,
    pub total_sol_claimed: u64,
    pub total_usdc_claimed: u64,
    pub registered_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct RewardAccount {
    pub project: Pubkey,
    pub operator_account: Pubkey,
    pub operator: Pubkey,
    pub accrued_sol: u64,
    pub accrued_usdc: u64,
    pub claimed_sol: u64,
    pub claimed_usdc: u64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum FundingAsset {
    Sol,
    Usdc,
}

#[event]
pub struct Deposit {
    pub project: Pubkey,
    pub funder: Pubkey,
    pub asset: FundingAsset,
    pub gross_amount: u64,
    pub fee_amount: u64,
    pub net_amount: u64,
    pub treasury_balance: u64,
}

#[event]
pub struct OperatorRegistered {
    pub project: Pubkey,
    pub operator: Pubkey,
    pub operator_account: Pubkey,
}

#[event]
pub struct RewardAccrued {
    pub project: Pubkey,
    pub operator: Pubkey,
    pub asset: FundingAsset,
    pub amount: u64,
    pub total_accrued: u64,
}

#[event]
pub struct RewardClaimed {
    pub project: Pubkey,
    pub operator: Pubkey,
    pub asset: FundingAsset,
    pub amount: u64,
    pub total_claimed: u64,
}

#[error_code]
pub enum FyxvoError {
    #[msg("The signer is not authorized to perform this action.")]
    Unauthorized,
    #[msg("The protocol is currently paused.")]
    ProgramPaused,
    #[msg("The provided amount is invalid.")]
    InvalidAmount,
    #[msg("The configured fee exceeds the allowed maximum.")]
    FeeTooHigh,
    #[msg("The provided treasury account does not match the protocol configuration.")]
    InvalidTreasury,
    #[msg("The provided project account is invalid.")]
    InvalidProject,
    #[msg("The provided operator registry account is invalid.")]
    InvalidOperatorRegistry,
    #[msg("The provided operator account is invalid.")]
    InvalidOperatorAccount,
    #[msg("The provided reward account is invalid.")]
    InvalidRewardAccount,
    #[msg("The provided mint does not match the configured USDC mint.")]
    InvalidMint,
    #[msg("The provided token account is invalid for this instruction.")]
    InvalidTokenAccount,
    #[msg("The project does not have enough available balance for this operation.")]
    InsufficientProjectBalance,
    #[msg("There is no accrued reward available to claim.")]
    NothingToClaim,
    #[msg("A checked arithmetic operation overflowed or underflowed.")]
    MathOverflow,
    #[msg("The treasury does not hold enough lamports to process this claim.")]
    InsufficientTreasuryLamports,
}

fn calculate_fee(amount: u64, fee_bps: u16) -> Result<(u64, u64)> {
    let fee = (amount as u128)
        .checked_mul(fee_bps as u128)
        .ok_or(FyxvoError::MathOverflow)?
        .checked_div(BASIS_POINTS_DENOMINATOR)
        .ok_or(FyxvoError::MathOverflow)?;
    let fee_u64 = u64::try_from(fee).map_err(|_| error!(FyxvoError::MathOverflow))?;
    let net_amount = checked_sub(amount, fee_u64)?;
    Ok((fee_u64, net_amount))
}

fn checked_add(left: u64, right: u64) -> Result<u64> {
    left.checked_add(right)
        .ok_or_else(|| error!(FyxvoError::MathOverflow))
}

fn checked_sub(left: u64, right: u64) -> Result<u64> {
    left.checked_sub(right)
        .ok_or_else(|| error!(FyxvoError::MathOverflow))
}

fn transfer_lamports_from_treasury<'info>(
    treasury_info: &AccountInfo<'info>,
    destination_info: &AccountInfo<'info>,
    amount: u64,
) -> Result<()> {
    let minimum_balance = Rent::get()?.minimum_balance(treasury_info.data_len());
    let treasury_lamports = treasury_info.lamports();
    let remaining_lamports = checked_sub(treasury_lamports, amount)?;
    require!(
        remaining_lamports >= minimum_balance,
        FyxvoError::InsufficientTreasuryLamports
    );

    **treasury_info.try_borrow_mut_lamports()? -= amount;
    **destination_info.try_borrow_mut_lamports()? += amount;
    Ok(())
}
