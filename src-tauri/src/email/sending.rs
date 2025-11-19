use resend_rs::types::CreateEmailBaseOptions;
use resend_rs::{Resend, Result};

async fn send_email() -> Result<()> {
    let resend = Resend::new("re_TMnnEXAq_PVaxY8UmeaR7FGT53iNdrM5j");

    let from = "onboarding@resend.dev";
    let to = ["m.guerreiro@slimstock.com"];
    let subject = "Hello World";

    let email = CreateEmailBaseOptions::new(from, to, subject)
        .with_html("<p>Congrats on sending your <strong>first email</strong>!</p>");

    let _email = resend.emails.send(email).await?;
    println!("{:?}", _email);

    Ok(())
}
