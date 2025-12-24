use resend_rs::types::CreateEmailBaseOptions;
use resend_rs::{Resend, Result};

pub async fn send_assignment_email(assignee_name: &str, post_id: i64, post_title: &str) -> Result<()> {
    let resend = Resend::new("re_TMnnEXAq_PVaxY8UmeaR7FGT53iNdrM5j");

    let from = "onboarding@resend.dev";
    
    // Map names to emails
    let to_email = match assignee_name {
        "Alex" => "test+alex@example.com",
        "Maria" => "test+maria@example.com",
        "David" => "test+david@example.com",
        "Sarah" => "test+sarah@example.com",
        _ => {
            println!("No email mapping found for assignee: {}", assignee_name);
            return Ok(());
        }
    };
    
    let to = [to_email];
    let subject = format!("New Assignment: {}", post_title);
    
    let html_body = format!(
        "<h1>New Post Assignment</h1>
        <p>Hello <strong>{}</strong>,</p>
        <p>You have been assigned to a new Reddit post:</p>
        <blockquote>{}</blockquote>
        <p>Post ID: {}</p>
        <p>Please check the Ruddit Client for more details.</p>",
        assignee_name, post_title, post_id
    );

    let email = CreateEmailBaseOptions::new(from, to, &subject)
        .with_html(&html_body);

    let _email = resend.emails.send(email).await?;
    println!("Email sent successfully to {}: {:?}", to_email, _email);

    Ok(())
}
